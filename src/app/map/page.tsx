'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Map as LeafletMap, DivIcon } from 'leaflet'; // Import Leaflet types
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, WifiOff, ServerCog, AlertTriangle, MapPin } from 'lucide-react'; // Added MapPin
import { SensorData, getSensorData as getMockSensorData } from '@/services/sensor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

// Dynamically import Leaflet components with ssr: false
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// --- City Data Interface ---
interface CityTemperature {
  city: string;
  lat: number;
  lng: number;
  temperature: number;
}

// --- Helper Function to Create Custom Icons ---
const createCustomIcon = (
    temperature: number | null,
    colorClass: 'primary' | 'accent',
    size: number = 30,
    fontSize: number = 10
): DivIcon | null => {
    // Ensure Leaflet (L) is available on the client-side
    if (typeof window === 'undefined' || !(window as any).L) return null;

    const L = (window as any).L;
    const color = colorClass === 'primary' ? 'hsl(var(--primary))' : 'hsl(var(--accent))';
    const textColor = colorClass === 'primary' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--accent-foreground))';

    const displayTemp = temperature !== null ? temperature.toFixed(0) + '°' : '?';

    return L.divIcon({
        html: `<div style="background-color: ${color}; color: ${textColor}; border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(0,0,0,0.1);" title="${temperature !== null ? temperature.toFixed(1) + '°C' : 'N/A'}">${displayTemp}</div>`,
        className: '', // Important to clear default styles
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size]
    });
};


// --- Inner Map Component ---
// Memoize the inner component to prevent unnecessary re-renders
const MapInner = React.memo(({
    center,
    zoom,
    whenCreated,
    isLoading,
    location,
    userSensorIcon,
    userSensorData,
    usingMockData,
    sensorIp,
    cityTemperatures,
    cityIcons
} : {
    center: LatLngExpression;
    zoom: number;
    whenCreated: (map: LeafletMap) => void;
    isLoading: boolean;
    location: LatLngExpression | null;
    userSensorIcon: DivIcon | null;
    userSensorData: SensorData | null;
    usingMockData: boolean;
    sensorIp: string | null;
    cityTemperatures: CityTemperature[];
    cityIcons: { [key: string]: DivIcon };
}) => {
     if (!MapContainer || !TileLayer || !Marker || !Popup) {
        // Should not happen if MapInner is rendered correctly, but acts as a safeguard
        return <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg" />;
    }

    return (
         <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
            className="rounded-b-lg"
            whenCreated={whenCreated} // Pass the callback
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Overlay Skeleton while fetching data *inside* the MapContainer */}
            {isLoading && (
                <div className="absolute inset-0 w-full h-full rounded-b-lg z-10 bg-background/80 flex items-center justify-center pointer-events-none">
                     <MapPin className="h-10 w-10 animate-pulse text-primary" />
                     <p className="ml-4 text-muted-foreground">Loading Sensor Data...</p>
                 </div>
            )}

            {/* Markers are rendered conditionally based on data *inside* the MapContainer */}
            {!isLoading && location && userSensorIcon && userSensorData && (
                <Marker position={location} icon={userSensorIcon}>
                    <Popup>
                        <div className="p-1 text-sm">
                            <h4 className="font-semibold mb-1">Your Sensor {usingMockData ? '(Mock)' : ''}</h4>
                            {userSensorData.temperature !== null && (
                                <p className="text-xs flex items-center"><Thermometer className="inline h-3 w-3 mr-1 text-red-500" /> {userSensorData.temperature.toFixed(1)}°C</p>
                            )}
                            {userSensorData.humidity !== null && (
                                 <p className="text-xs flex items-center"><Droplets className="inline h-3 w-3 mr-1 text-blue-500" /> {userSensorData.humidity.toFixed(1)}%</p>
                            )}
                            {sensorIp && <p className="text-xs mt-1 text-muted-foreground">IP: {sensorIp}</p>}
                        </div>
                    </Popup>
                </Marker>
            )}

            {!isLoading && cityTemperatures.map((city) => {
                const icon = cityIcons[city.city];
                if (!icon) return null;
                return (
                    <Marker key={city.city} position={[city.lat, city.lng]} icon={icon}>
                        <Popup>
                            <div className="p-1">
                              <h4 className="font-semibold text-sm mb-1">{city.city}</h4>
                              <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{city.temperature.toFixed(1)}°C</p>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
});
MapInner.displayName = 'MapInner'; // Set display name for React DevTools


// --- Main Map Page Component ---
const MapPage: React.FC = () => {
    const [isClient, setIsClient] = useState(false);
    const [leafletLoaded, setLeafletLoaded] = useState(false);
    const [userSensorData, setUserSensorData] = useState<SensorData | null>(null);
    const [sensorIp, setSensorIp] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usingMockData, setUsingMockData] = useState(false);
    const [location, setLocation] = useState<LatLngExpression | null>(null); // User/Sensor location
    const [locationError, setLocationError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState<LatLngExpression>([20, 0]); // Default center
    const [mapZoom, setMapZoom] = useState<number>(3); // Default zoom
    const mapRef = useRef<LeafletMap | null>(null);

    // Static city data
    const cityTemperatures: CityTemperature[] = useMemo(() => [
        { city: 'New York', lat: 40.7128, lng: -74.0060, temperature: 15.5 },
        { city: 'London', lat: 51.5074, lng: -0.1278, temperature: 12.1 },
        { city: 'Tokyo', lat: 35.6895, lng: 139.6917, temperature: 18.3 },
        { city: 'Sydney', lat: -33.8688, lng: 151.2093, temperature: 24.0 },
        { city: 'Cairo', lat: 30.0444, lng: 31.2357, temperature: 28.5 },
        { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, temperature: 26.2 },
    ], []);

     // --- Effects ---

    // Set client flag and load Leaflet CSS/JS compatibility
    useEffect(() => {
        setIsClient(true);
        // Dynamically import CSS only on the client
        Promise.all([
             import('leaflet/dist/leaflet.css'),
             import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'),
             import('leaflet-defaulticon-compatibility') // Import JS
        ]).then(() => {
            // Check if L is available after imports
             if ((window as any).L) {
                 // Fix default icon paths after dynamic import
                 // This configuration needs to be done *before* any icons are created or markers rendered
                 // Ensure it runs only once after Leaflet is loaded
                 delete ((window as any).L.Icon.Default.prototype as any)._getIconUrl;
                 (window as any).L.Icon.Default.mergeOptions({
                    // Use relative paths based on where webpack copies the files
                    iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
                    iconUrl: '/_next/static/media/marker-icon.png',
                    shadowUrl: '/_next/static/media/marker-shadow.png',
                 });
                 setLeafletLoaded(true);
                 console.log("Leaflet resources loaded and icons configured.");
             } else {
                 console.error("Leaflet (L) not found on window after imports.");
                 setError("Map resources failed to load correctly.");
             }
        }).catch(err => {
             console.error("Failed to load Leaflet resources", err);
             setError("Map resources failed to load.");
        });
    }, []);

    // Load sensor IP from localStorage
    useEffect(() => {
        if (isClient) {
            const storedIp = localStorage.getItem('sensorIp');
            setSensorIp(storedIp);
        }
    }, [isClient]);

    // Fetch user sensor data and location based on IP
    const fetchUserDataAndLocation = useCallback(async () => {
         if (!isClient || !leafletLoaded) return; // Ensure client and leaflet are ready

        setIsLoading(true);
        setError(null);
        setLocationError(null);
        setUsingMockData(false);

        let currentIp = sensorIp || localStorage.getItem('sensorIp');

        if (currentIp) {
            try {
                // Fetch location first to update map center quickly if possible
                let locationCoords: LatLngExpression | null = null;
                try {
                     const locationRes = await fetch(`https://ipapi.co/${currentIp}/json/`);
                     if (locationRes.ok) {
                         const locationJson = await locationRes.json();
                         if (locationJson.latitude && locationJson.longitude) {
                            locationCoords = [locationJson.latitude, locationJson.longitude];
                             setLocation(locationCoords);
                             // Only update map view if location *changes* significantly or map not yet centered
                             if (mapRef.current && (!location || Math.abs(location[0] - locationCoords[0]) > 0.01 || Math.abs(location[1] - locationCoords[1]) > 0.01)) {
                                 mapRef.current.setView(locationCoords, 10);
                             } else if (!mapRef.current && !location) { // Set initial center if map not yet created and no previous location
                                setMapCenter(locationCoords);
                                setMapZoom(10);
                             }
                             setLocationError(null);
                         } else {
                            setLocationError('Location data incomplete from IP lookup.');
                         }
                     } else {
                         console.warn(`Location fetch failed with status: ${locationRes.status}.`);
                         setLocationError('Could not determine location from sensor IP.');
                     }
                 } catch (locErr: any) {
                     console.error('Error fetching location:', locErr);
                     setLocationError(`Failed to get location for ${currentIp}: ${locErr.message}.`);
                     // Don't fallback map center here, keep default or previous location
                 }

                // Fetch sensor data
                const dataRes = await fetch(`http://${currentIp}/data`);
                if (!dataRes.ok) throw new Error(`Sensor data response not OK (Status: ${dataRes.status})`);
                const dataJson: SensorData = await dataRes.json().catch(() => { throw new Error('Failed to parse data JSON') });
                const validatedData: SensorData = {
                    temperature: typeof dataJson.temperature === 'number' ? dataJson.temperature : null,
                    humidity: typeof dataJson.humidity === 'number' ? dataJson.humidity : null,
                };
                setUserSensorData(validatedData);
                setError(null); // Clear sensor data error if successful

            } catch (err: any) {
                console.error('Error fetching real sensor data:', err);
                setError(`Failed to connect to sensor at ${currentIp}: ${err.message}. Falling back to mock sensor data.`);
                // Location might have been fetched successfully or failed, retain locationError if set
                try {
                     const mockSensorData = await getMockSensorData();
                     setUserSensorData(mockSensorData);
                 } catch (mockErr) {
                     console.error('Failed fetching mock sensor data:', mockErr);
                     setUserSensorData({ temperature: null, humidity: null });
                 }
                setUsingMockData(true);
            } finally {
                setIsLoading(false);
            }
        } else {
             // Use mock sensor data if no IP is set
            try {
                const mockData = await getMockSensorData();
                setUserSensorData(mockData);
                setLocation(null); // No location possible without IP
                setUsingMockData(true);
                setError(null);
                setLocationError('No sensor IP configured. Cannot determine location.');
            } catch (mockErr) {
                console.error('Error fetching mock sensor data:', mockErr);
                setError('Failed to fetch mock sensor data.');
                setLocationError('Failed to fetch location (no IP).');
                setUserSensorData(null);
            } finally {
                setIsLoading(false);
            }
        }
    }, [isClient, leafletLoaded, sensorIp, location]); // Depend on location to decide map centering logic

    // Fetch data on initial load and when sensorIp changes
    useEffect(() => {
        if (isClient && leafletLoaded) {
            fetchUserDataAndLocation();
             // Optional: Set up an interval to refetch data periodically
             // const intervalId = setInterval(fetchUserDataAndLocation, 30000);
             // return () => clearInterval(intervalId);
        }
    }, [isClient, leafletLoaded, fetchUserDataAndLocation]); // Depend on isClient, leafletLoaded, and the fetch function itself

    // Callback to set the map instance ref
    const mapRefCb = useCallback((node: LeafletMap | null) => {
       if (node !== null) {
          mapRef.current = node;
          // If we have a location and the map just got created, set the view
          if(location && !isLoading){
               node.setView(location, 10);
          }
       }
    }, [location, isLoading]); // Re-run if location changes after map creation


     // --- Memoized Values ---

    // Memoize the user sensor icon
    const userSensorIcon = useMemo(() => {
        if (!leafletLoaded || !userSensorData) return null;
        // Pass window.L explicitly if needed by createCustomIcon, though it should be global
        return createCustomIcon(userSensorData.temperature, 'primary', 35, 12);
    }, [leafletLoaded, userSensorData]);

    // Memoize city icons
    const cityIcons = useMemo(() => {
        if (!leafletLoaded) return {};
        // Pass window.L explicitly if needed by createCustomIcon
        return cityTemperatures.reduce((acc, city) => {
            const icon = createCustomIcon(city.temperature, 'accent', 30, 10);
            if (icon) {
                acc[city.city] = icon;
            }
            return acc;
        }, {} as { [key: string]: DivIcon });
    }, [leafletLoaded, cityTemperatures]);


    // --- Render Logic ---

    const renderMapContent = () => {
         if (!isClient || !leafletLoaded) {
             // Show skeleton while waiting for client-side hydration and dynamic imports
             return <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg" />;
         }

        // Pass necessary props to the memoized MapInner component
        return (
             <MapInner
                 center={mapCenter}
                 zoom={mapZoom}
                 whenCreated={mapRefCb} // Pass the callback ref
                 isLoading={isLoading}
                 location={location}
                 userSensorIcon={userSensorIcon}
                 userSensorData={userSensorData}
                 usingMockData={usingMockData}
                 sensorIp={sensorIp}
                 cityTemperatures={cityTemperatures}
                 cityIcons={cityIcons}
             />
        );
     };


    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold text-primary">Sensor Location Map</h1>

            {/* Error and Status Alerts */}
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Sensor Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
             {locationError && !error && ( // Show location error only if there's no sensor error
                 <Alert variant="default" className="mb-4 border-orange-500 text-orange-800 dark:border-orange-400 dark:text-orange-300">
                    <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400"/>
                    <AlertTitle>Location Issue</AlertTitle>
                    <AlertDescription>{locationError}</AlertDescription>
                 </Alert>
             )}
             {usingMockData && !error && !isLoading && ( // Show mock data info only if loaded and no connection error
                <Alert variant="default" className="mb-4 border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
                   <ServerCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                   <AlertTitle>Using Mock Data</AlertTitle>
                   <AlertDescription>
                     {sensorIp ? 'Could not connect to sensor. ' : 'No sensor IP configured. '}
                     Displaying mock sensor data. Go to <a href="/settings" className="underline font-medium">Settings</a> to configure your IP. Location may be inaccurate or unavailable.
                   </AlertDescription>
                </Alert>
             )}

             {/* Map Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Live Map</CardTitle>
                    <CardDescription>
                        {location ? "Showing your sensor's approximate location and comparing with major cities." : "Map centered globally. Configure sensor IP to see its location."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] p-0 relative">
                    {/* Render the map or the initial skeleton */}
                    {renderMapContent()}
                </CardContent>
            </Card>

             {/* Simple Sensor Data Display */}
             <Card>
                <CardHeader>
                    <CardTitle>Your Sensor Data</CardTitle>
                     <CardDescription>Current readings from {usingMockData ? 'mock source' : `sensor at ${sensorIp || 'Unknown IP'}`}.</CardDescription>
                </CardHeader>
                <CardContent className="flex space-x-6">
                     <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        {isLoading ? <Skeleton className="h-6 w-16 mt-1 mx-auto" /> : <p className="text-xl font-bold">{userSensorData?.temperature?.toFixed(1) ?? 'N/A'}°C</p>}
                     </div>
                    <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Humidity</Label>
                         {isLoading ? <Skeleton className="h-6 w-16 mt-1 mx-auto" /> : <p className="text-xl font-bold">{userSensorData?.humidity?.toFixed(1) ?? 'N/A'}%</p>}
                    </div>
                     {/* Display Location if available */}
                     {location && !locationError && (
                          <div className="text-center">
                            <Label className="text-xs text-muted-foreground">Approx. Location</Label>
                            <p className="text-xl font-bold">
                               <MapPin className="inline h-5 w-5 text-green-600 mr-1"/> Located
                            </p>
                         </div>
                     )}
                     {/* Show loading/error for location if applicable */}
                     {isLoading && !location && <Skeleton className="h-6 w-24 mt-1" />}
                     {locationError && (
                         <div className="text-center">
                            <Label className="text-xs text-muted-foreground">Approx. Location</Label>
                            <p className="text-xl font-bold text-orange-600">
                               <WifiOff className="inline h-5 w-5 mr-1"/> Error
                            </p>
                         </div>
                     )}
                       {!isLoading && !location && !locationError && !sensorIp && ( // Case: No IP, Mock data, finished loading
                         <div className="text-center">
                            <Label className="text-xs text-muted-foreground">Approx. Location</Label>
                             <p className="text-xl font-bold text-muted-foreground">
                                <MapPin className="inline h-5 w-5 mr-1"/> N/A
                            </p>
                         </div>
                     )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MapPage;

    