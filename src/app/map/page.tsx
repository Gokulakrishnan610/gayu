
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Map as LeafletMap, DivIcon } from 'leaflet'; // Import Leaflet types
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, WifiOff, ServerCog, AlertTriangle, MapPin } from 'lucide-react';
import { SensorData, getSensorData as getMockSensorData } from '@/services/sensor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

// Dynamically import Leaflet components with ssr: false
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false, loading: () => <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg" /> });
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
    // Check if L is available on window before using it
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
// This component renders the actual MapContainer and its children.
// Use React.memo for performance optimization if props don't change often
const MapInner = React.memo(({
    center,
    zoom,
    setMapInstance, // Function to set map instance in parent
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
    setMapInstance: (map: LeafletMap | null) => void; // Function to set map in parent
    isLoading: boolean;
    location: LatLngExpression | null;
    userSensorIcon: DivIcon | null;
    userSensorData: SensorData | null;
    usingMockData: boolean;
    sensorIp: string | null;
    cityTemperatures: CityTemperature[];
    cityIcons: { [key: string]: DivIcon };
}) => {

    return (
         <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
            className="rounded-b-lg"
            whenCreated={setMapInstance} // Pass the callback directly
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
    const mapRef = useRef<LeafletMap | null>(null); // Ref to store map instance
    const [mapInstanceKey, setMapInstanceKey] = useState<number>(0); // Key to force remount

    // --- Effects ---

    // Set client flag and load Leaflet resources
    useEffect(() => {
        setIsClient(true);

        // Dynamically import CSS and JS only on the client
        Promise.all([
            import('leaflet/dist/leaflet.css'),
            import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'),
            import('leaflet'), // Import Leaflet library itself
            import('leaflet-defaulticon-compatibility') // Import JS compatibility
        ]).then(([_, __, L]) => { // Destructure L from the resolved modules
            // Check if L is available AFTER imports complete
            if (L && L.Icon) {
                 // Fix default icon paths after dynamic import
                 delete (L.Icon.Default.prototype as any)._getIconUrl;
                 L.Icon.Default.mergeOptions({
                     iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
                     iconUrl: '/_next/static/media/marker-icon.png',
                     shadowUrl: '/_next/static/media/marker-shadow.png',
                 });

                (window as any).L = L; // Make L globally available if needed elsewhere, though direct import is preferred
                setLeafletLoaded(true);
                console.log("Leaflet resources loaded and icons configured.");
            } else {
                console.error("Leaflet (L) or L.Icon not found on window after imports.");
                setError("Map resources failed to load correctly.");
            }
        }).catch(err => {
            console.error("Failed to load Leaflet resources", err);
            setError("Map resources failed to load.");
        });

        // Clean up map instance on unmount
        return () => {
            console.log("MapPage unmounting, destroying map instance if exists.");
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    // Load sensor IP from localStorage
    useEffect(() => {
        if (isClient) {
            const storedIp = localStorage.getItem('sensorIp');
            setSensorIp(storedIp);
        }
    }, [isClient]);

    // Fetch user sensor data and location based on IP
    const fetchUserDataAndLocation = useCallback(async () => {
        if (!isClient || !leafletLoaded) return;

        setIsLoading(true);
        setError(null);
        setLocationError(null);
        setUsingMockData(false);

        let currentIp = sensorIp || localStorage.getItem('sensorIp');

        if (currentIp) {
            let locationCoords: LatLngExpression | null = null;
            // --- Fetch Location ---
            try {
                const locationRes = await fetch(`https://ipapi.co/${currentIp}/json/`);
                if (locationRes.ok) {
                    const locationJson = await locationRes.json();
                    if (locationJson.latitude && locationJson.longitude) {
                        locationCoords = [locationJson.latitude, locationJson.longitude];
                        setLocation(locationCoords);
                        if (mapRef.current) {
                            mapRef.current.setView(locationCoords, 10);
                        } else {
                            setMapCenter(locationCoords); // Update initial center if map not ready
                            setMapZoom(10);
                        }
                        setLocationError(null);
                    } else {
                        setLocationError('Location data incomplete from IP API.');
                    }
                } else {
                     setLocationError(`IP API error (Status: ${locationRes.status}). Could not get location.`);
                }
            } catch (locErr: any) {
                console.error('Error fetching location:', locErr);
                setLocationError(`Failed to get location: ${locErr.message}.`);
            }

             // --- Fetch Sensor Data ---
            try {
                 const dataRes = await fetch(`http://${currentIp}/data`);
                 if (!dataRes.ok) throw new Error(`Sensor error (Status: ${dataRes.status})`);
                 const dataJson: SensorData = await dataRes.json();
                 const validatedData: SensorData = {
                     temperature: typeof dataJson.temperature === 'number' ? dataJson.temperature : null,
                     humidity: typeof dataJson.humidity === 'number' ? dataJson.humidity : null,
                 };
                 setUserSensorData(validatedData);
                 setError(null); // Clear sensor error on success

            } catch (err: any) {
                console.error('Error fetching real sensor data:', err);
                setError(`Failed to connect to sensor at ${currentIp}: ${err.message}. Using mock data.`);
                try {
                    const mockData = await getMockSensorData();
                    setUserSensorData(mockData);
                } catch (mockErr: any) {
                    console.error('Failed fetching mock sensor data:', mockErr);
                    setUserSensorData({ temperature: null, humidity: null });
                }
                setUsingMockData(true);
            } finally {
                setIsLoading(false);
            }
        } else {
            // --- No IP configured, use mock data ---
            setError(null); // No connection error if no IP is set
            setLocationError('No sensor IP configured.');
            try {
                const mockData = await getMockSensorData();
                setUserSensorData(mockData);
                setUsingMockData(true);
            } catch (mockErr: any) {
                console.error('Error fetching mock sensor data:', mockErr);
                setError('Failed to fetch mock sensor data.');
                setUserSensorData({ temperature: null, humidity: null });
            } finally {
                 setLocation(null); // Ensure location is null if no IP
                 setIsLoading(false);
            }
        }
    }, [isClient, leafletLoaded, sensorIp]); // Removed mapRef dependency

    // Fetch data on initial load and when sensorIp changes
    useEffect(() => {
        if (isClient && leafletLoaded) {
            fetchUserDataAndLocation();
        }
    }, [isClient, leafletLoaded, fetchUserDataAndLocation]); // fetchUserDataAndLocation is memoized

    // Callback to set the map instance once it's created
    const setMapInstance = useCallback((map: LeafletMap | null) => {
        if (map && !mapRef.current) { // Only set if map is valid and not already set
            console.log("Map instance created and set.");
            mapRef.current = map;
            // If location is already known when map is first created, set view
            if (location) {
                map.setView(location, 10);
            }
        } else if (!map && mapRef.current) {
            // This case might happen if the component unmounts, cleanup handled in useEffect return
             console.log("Map instance is being unset (likely during cleanup).");
             mapRef.current = null;
        }
    }, [location]); // Recreate callback if location changes (for initial setView)


    // --- Memoized Values ---

    // Static city data - moved before cityIcons useMemo
    const cityTemperatures: CityTemperature[] = useMemo(() => [
        { city: 'New York', lat: 40.7128, lng: -74.0060, temperature: 15.5 },
        { city: 'London', lat: 51.5074, lng: -0.1278, temperature: 12.1 },
        { city: 'Tokyo', lat: 35.6895, lng: 139.6917, temperature: 18.3 },
        { city: 'Sydney', lat: -33.8688, lng: 151.2093, temperature: 24.0 },
        { city: 'Cairo', lat: 30.0444, lng: 31.2357, temperature: 28.5 },
        { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, temperature: 26.2 },
    ], []);

    // Memoize the user sensor icon
    const userSensorIcon = useMemo(() => {
        // Depend on leafletLoaded state before creating icon
        if (!leafletLoaded || !userSensorData) return null;
        return createCustomIcon(userSensorData.temperature, 'primary', 35, 12);
    }, [leafletLoaded, userSensorData]);

    // Memoize city icons
    const cityIcons = useMemo(() => {
        if (!leafletLoaded) return {}; // Ensure L exists and leaflet is loaded
        return cityTemperatures.reduce((acc, city) => {
            const icon = createCustomIcon(city.temperature, 'accent', 30, 10);
            if (icon) {
                acc[city.city] = icon;
            }
            return acc;
        }, {} as { [key: string]: DivIcon });
    }, [leafletLoaded, cityTemperatures]); // Added cityTemperatures dependency

    // --- Render Logic ---

    // Conditional rendering logic moved outside the main return for clarity
    const renderMapContent = () => {
         if (!isClient || !leafletLoaded) {
             // Skeleton shown until client-side hydration and Leaflet loading complete
             return <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg" />;
         }

        // Render the map once client-side and leaflet are ready
        return (
            <MapInner
                center={mapCenter}
                zoom={mapZoom}
                setMapInstance={setMapInstance} // Pass the callback to MapInner
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
            {locationError && !error && ( // Show location error only if there's no primary sensor error
                <Alert variant="default" className="mb-4 border-orange-500 text-orange-800 dark:border-orange-400 dark:text-orange-300">
                    <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400"/>
                    <AlertTitle>Location Issue</AlertTitle>
                    <AlertDescription>{locationError}</AlertDescription>
                </Alert>
            )}
             {usingMockData && !error && !isLoading && ( // Show only if using mock, no error, and not loading
                <Alert variant="default" className="mb-4 border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
                    <ServerCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle>Using Mock Data</AlertTitle>
                    <AlertDescription>
                        {sensorIp ? `Could not connect to ${sensorIp}. ` : 'No sensor IP. '}
                        Displaying mock data. Configure in <a href="/settings" className="underline font-medium">Settings</a>. Location may be unavailable.
                    </AlertDescription>
                </Alert>
            )}

            {/* Map Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Live Map</CardTitle>
                    <CardDescription>
                        {location ? "Your sensor location vs. major cities." : "Configure sensor IP for location."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] p-0 relative">
                     {renderMapContent()}
                </CardContent>
            </Card>

            {/* Simple Sensor Data Display */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Sensor Data</CardTitle>
                    <CardDescription>Readings from {usingMockData ? 'mock source' : `sensor at ${sensorIp || 'Unknown IP'}`}.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 items-center"> {/* Use flex-wrap and gap */}
                    <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        {isLoading ? <Skeleton className="h-6 w-16 mt-1 mx-auto" /> : <p className="text-xl font-bold">{userSensorData?.temperature?.toFixed(1) ?? 'N/A'}°C</p>}
                    </div>
                    <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Humidity</Label>
                        {isLoading ? <Skeleton className="h-6 w-16 mt-1 mx-auto" /> : <p className="text-xl font-bold">{userSensorData?.humidity?.toFixed(1) ?? 'N/A'}%</p>}
                    </div>
                    {/* Location Status Section */}
                    <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Approx. Location</Label>
                        {isLoading ? (
                            <Skeleton className="h-6 w-24 mt-1" />
                         ) : location && !locationError ? (
                            <p className="text-xl font-bold flex items-center justify-center text-green-600">
                                <MapPin className="inline h-5 w-5 mr-1"/> Located
                            </p>
                        ) : locationError ? (
                            <p className="text-xl font-bold flex items-center justify-center text-orange-600">
                                <WifiOff className="inline h-5 w-5 mr-1"/> Error
                            </p>
                         ) : ( // No location, no error (likely no IP)
                           <p className="text-xl font-bold flex items-center justify-center text-muted-foreground">
                                <MapPin className="inline h-5 w-5 mr-1"/> N/A
                           </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MapPage;

    