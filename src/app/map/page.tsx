
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Map as LeafletMap, Icon as LeafletIconType, DivIcon } from 'leaflet'; // Import Leaflet types, explicitly DivIcon
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, MapPin, WifiOff, ServerCog } from 'lucide-react';
import { SensorData, getSensorData as getMockSensorData } from '@/services/sensor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
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
): DivIcon | null => { // Explicitly return DivIcon | null
    // Ensure Leaflet (L) is available on the client-side
    if (typeof window === 'undefined' || !window.L) return null;

    const L = window.L;
    const color = colorClass === 'primary' ? 'hsl(var(--primary))' : 'hsl(var(--accent))';
    const textColor = colorClass === 'primary' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--accent-foreground))';

    // Basic validation for temperature
    const displayTemp = temperature !== null ? temperature.toFixed(0) + '°' : '?';

    return L.divIcon({
        html: `<div style="background-color: ${color}; color: ${textColor}; border-radius: 50%; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 1px solid rgba(0,0,0,0.1);" title="${temperature !== null ? temperature.toFixed(1) + '°C' : 'N/A'}">${displayTemp}</div>`,
        className: '', // Important to clear default styles
        iconSize: [size, size],
        iconAnchor: [size / 2, size], // Point of the icon which will correspond to marker's location
        popupAnchor: [0, -size] // Point from which the popup should open relative to the iconAnchor
    });
};


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
    const [locationLoading, setLocationLoading] = useState(true);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState<LatLngExpression>([20, 0]); // Default center
    const [mapZoom, setMapZoom] = useState<number>(3); // Default zoom
    const mapRef = useRef<LeafletMap | null>(null); // Ref to store map instance

    // Static city data for comparison
    const cityTemperatures: CityTemperature[] = useMemo(() => [
        { city: 'New York', lat: 40.7128, lng: -74.0060, temperature: 15.5 },
        { city: 'London', lat: 51.5074, lng: -0.1278, temperature: 12.1 },
        { city: 'Tokyo', lat: 35.6895, lng: 139.6917, temperature: 18.3 },
        { city: 'Sydney', lat: -33.8688, lng: 151.2093, temperature: 24.0 },
        { city: 'Cairo', lat: 30.0444, lng: 31.2357, temperature: 28.5 },
        { city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, temperature: 26.2 },
    ], []);

    // Check if running on client and load Leaflet CSS/JS compatibility layer
    useEffect(() => {
        setIsClient(true);
        // Dynamically import CSS only on the client
        import('leaflet/dist/leaflet.css');
        import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');

        // Dynamically import the compatibility script and then set leafletLoaded
        import('leaflet-defaulticon-compatibility')
          .then(() => {
              // Ensure L is globally available after import
              if (window.L) {
                  setLeafletLoaded(true);
              } else {
                  console.error("Leaflet (L) not found on window after compatibility import.");
                  setError("Map resources failed to load correctly.");
              }
          })
          .catch(err => {
              console.error("Failed to load Leaflet compatibility layer", err);
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
        if (!isClient) return;

        setIsLoading(true);
        setLocationLoading(true);
        setError(null);
        setLocationError(null);
        setUsingMockData(false);

        let currentIp = sensorIp || localStorage.getItem('sensorIp');

        if (currentIp) {
            try {
                const [dataRes, locationRes] = await Promise.all([
                    fetch(`http://${currentIp}/data`).catch(e => { throw new Error(`Data fetch failed: ${e.message}`) }),
                    fetch(`https://ipapi.co/${currentIp}/json/`).catch(e => { throw new Error(`Location fetch failed: ${e.message}`) }),
                ]);

                // Handle Data
                if (!dataRes.ok) throw new Error(`Sensor data response not OK (Status: ${dataRes.status})`);
                const dataJson: SensorData = await dataRes.json().catch(() => { throw new Error('Failed to parse data JSON') });
                const validatedData: SensorData = {
                    temperature: typeof dataJson.temperature === 'number' ? dataJson.temperature : null,
                    humidity: typeof dataJson.humidity === 'number' ? dataJson.humidity : null,
                };
                setUserSensorData(validatedData);

                // Handle Location
                if (!locationRes.ok) {
                    console.warn(`Location fetch failed with status: ${locationRes.status}.`);
                    setLocation(null);
                    setLocationError('Could not determine location from sensor IP.');
                } else {
                    const locationJson = await locationRes.json().catch(() => { throw new Error('Failed to parse location JSON') });
                    if (locationJson.latitude && locationJson.longitude) {
                        const coords: LatLngExpression = [locationJson.latitude, locationJson.longitude];
                        setLocation(coords);
                        // Only set map center if it hasn't been set manually or by initial load
                        if (mapCenter[0] === 20 && mapCenter[1] === 0) { // Check against default
                             setMapCenter(coords);
                             setMapZoom(10);
                        }
                        setLocationError(null);
                    } else {
                        setLocation(null);
                        setLocationError('Location data incomplete from IP lookup.');
                    }
                }
                setError(null);

            } catch (err: any) {
                console.error('Error fetching real sensor data or location:', err);
                setError(`Failed to connect to sensor or get location for ${currentIp}: ${err.message}. Falling back to mock sensor data.`);
                setLocationError('Failed to determine location.');
                // Fallback to mock sensor data
                try {
                     const mockSensorData = await getMockSensorData(); // Fallback to mock on error
                     setUserSensorData(mockSensorData);
                 } catch (mockErr) {
                     console.error('Failed fetching mock sensor data:', mockErr);
                     setUserSensorData({ temperature: null, humidity: null });
                 }
                setLocation(null);
                setUsingMockData(true);
            } finally {
                setIsLoading(false);
                setLocationLoading(false);
            }
        } else {
            // Use mock sensor data if no IP is set
            try {
                const mockData = await getMockSensorData();
                setUserSensorData(mockData);
                setLocation(null);
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
                setLocationLoading(false);
            }
        }
    }, [isClient, sensorIp, mapCenter]); // Rerun if client status or IP changes

    // Fetch data on initial load and when sensorIp changes
    useEffect(() => {
        if (isClient) {
            fetchUserDataAndLocation();
             // Optional: Set up an interval to refetch data periodically
             // const intervalId = setInterval(fetchUserDataAndLocation, 30000); // Fetch every 30 seconds
             // return () => clearInterval(intervalId);
        }
    }, [isClient, fetchUserDataAndLocation]);

    // Memoize the user sensor icon
    const userSensorIcon = useMemo(() => {
        if (!leafletLoaded || !userSensorData) return null;
        // Use createCustomIcon safely
        return createCustomIcon(userSensorData.temperature, 'primary', 35, 12);
    }, [leafletLoaded, userSensorData]);

    // Memoize city icons
    const cityIcons = useMemo(() => {
        if (!leafletLoaded) return {}; // Check leafletLoaded first
        // Ensure createCustomIcon is available
        if (typeof createCustomIcon !== 'function') return {};

        return cityTemperatures.reduce((acc, city) => {
            const icon = createCustomIcon(city.temperature, 'accent', 30, 10);
            if (icon) {
                acc[city.city] = icon;
            }
            return acc;
        }, {} as { [key: string]: DivIcon }); // Ensure DivIcon type
    }, [leafletLoaded, cityTemperatures]); // Depend on leafletLoaded


    // Callback ref to get and manage the map instance
    const mapRefCallback = useCallback((node: LeafletMap | null) => {
        if (node) {
            // Store the map instance if it's newly created
            mapRef.current = node;
            // console.log('Map instance obtained:', node);
        }
    }, []);

     // Effect for cleaning up the map instance
     useEffect(() => {
        // Return a cleanup function
        return () => {
            if (mapRef.current) {
                // console.log('Removing map instance:', mapRef.current);
                mapRef.current.remove(); // Explicitly destroy the map
                mapRef.current = null; // Clear the ref
            }
        };
    }, []); // Empty dependency array ensures this runs only on unmount


    // --- Render Logic ---
    const renderMapContent = () => {
         // Show skeleton if not client, leaflet not loaded, or initial data load is happening
         if (!isClient || !leafletLoaded || isLoading) {
            return <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg z-10 bg-background/80 flex items-center justify-center">
                        <p className="text-muted-foreground">Loading Map & Sensor Data...</p>
                   </Skeleton>;
        }

        // Render the map once client-side and leaflet are ready
        return (
            <MapContainer
                // IMPORTANT: Add a key that changes ONLY when you absolutely need to force a full remount.
                // Usually, managing state and props correctly is enough. Avoid changing the key frequently.
                // key={mapInstanceKey}
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} // Ensure it fills the container
                className="rounded-b-lg"
                whenCreated={mapRefCallback} // Use whenCreated to get the map instance
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Marker for User Sensor Location */}
                {location && userSensorIcon && userSensorData && (
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

                {/* Markers for Cities */}
                {cityTemperatures.map((city) => {
                    const icon = cityIcons[city.city];
                    if (!icon) return null; // Skip if icon wasn't created
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
    };


    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold text-primary">Sensor Location Map</h1>

            {/* Error and Status Alerts */}
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
             {locationError && !error && (
                 <Alert variant="default" className="mb-4 border-orange-500 text-orange-800 dark:border-orange-400 dark:text-orange-300">
                    <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400"/>
                    <AlertTitle>Location Issue</AlertTitle>
                    <AlertDescription>{locationError}</AlertDescription>
                 </Alert>
             )}
             {usingMockData && !error && (
                <Alert variant="default" className="mb-4 border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
                   <ServerCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                   <AlertTitle>Using Mock Data</AlertTitle>
                   <AlertDescription>
                     {sensorIp ? 'Could not connect to sensor or determine location. ' : 'No sensor IP configured. '}
                     Displaying mock sensor data. Go to <a href="/settings" className="underline font-medium">Settings</a> to configure your IP.
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
                    {/* The map or skeleton is rendered here */}
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
                </CardContent>
            </Card>
        </div>
    );
};

export default MapPage;
