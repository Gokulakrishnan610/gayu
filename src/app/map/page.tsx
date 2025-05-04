'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Map as LeafletMap, Icon as LeafletIconType } from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, MapPin, WifiOff, ServerCog } from 'lucide-react';
import { SensorData, getSensorData as getMockSensorData } from '@/services/sensor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// --- Dynamic Imports for Leaflet Components ---
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

// --- Helper Function to Create Custom Icons ---
const createCustomIcon = (
    temperature: number | null,
    colorClass: 'primary' | 'accent',
    size: number = 30,
    fontSize: number = 10
): LeafletIconType | null => {
    if (typeof window === 'undefined' || !window.L) return null; // Ensure L is available

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
    const [sensorData, setSensorData] = useState<SensorData | null>(null);
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

    // Check if running on client and load Leaflet CSS/JS compatibility layer
    useEffect(() => {
        setIsClient(true);
        import('leaflet/dist/leaflet.css');
        import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
        import('leaflet-defaulticon-compatibility').then(() => {
            setLeafletLoaded(true);
        }).catch(err => {
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

    // Fetch sensor data and location based on IP
    const fetchDataAndLocation = useCallback(async () => {
        if (!isClient) return;

        setIsLoading(true);
        setLocationLoading(true);
        setError(null);
        setLocationError(null);
        setUsingMockData(false);

        let currentIp = sensorIp || localStorage.getItem('sensorIp'); // Use state or local storage

        if (currentIp) {
            try {
                // Fetch data and location in parallel
                const [dataRes, locationRes] = await Promise.all([
                    fetch(`http://${currentIp}/data`).catch(e => { throw new Error(`Data fetch failed: ${e.message}`)}),
                    fetch(`https://ipapi.co/${currentIp}/json/`).catch(e => {throw new Error(`Location fetch failed: ${e.message}`)}), // Using ipapi.co for geolocation
                ]);

                // --- Handle Data ---
                if (!dataRes.ok) {
                    throw new Error(`Sensor data response not OK (Status: ${dataRes.status})`);
                }
                const dataJson: SensorData = await dataRes.json().catch(() => { throw new Error('Failed to parse data JSON')});
                const validatedData: SensorData = {
                    temperature: typeof dataJson.temperature === 'number' ? dataJson.temperature : null,
                    humidity: typeof dataJson.humidity === 'number' ? dataJson.humidity : null,
                };
                setSensorData(validatedData);

                // --- Handle Location ---
                 if (!locationRes.ok) {
                     console.warn(`Location fetch failed with status: ${locationRes.status}. Using mock data as fallback.`);
                     // Attempt to get mock data if location fails
                     const mockData = await getMockSensorData();
                     setSensorData(mockData);
                     setLocation(null); // Indicate location failure
                     setLocationError('Could not determine location from IP. Displaying only mock sensor data.');
                     setUsingMockData(true); // Still using mock *sensor* data

                 } else {
                     const locationJson = await locationRes.json().catch(() => {throw new Error('Failed to parse location JSON')});
                     if (locationJson.latitude && locationJson.longitude) {
                        const coords: LatLngExpression = [locationJson.latitude, locationJson.longitude];
                         setLocation(coords);
                         setMapCenter(coords); // Center map on fetched location
                         setMapZoom(10); // Zoom in a bit
                         setLocationError(null);
                     } else {
                         setLocation(null); // Set location to null if lat/lon are missing
                         setLocationError('Location data incomplete. Map cannot center on sensor.');
                         console.warn('Incomplete location data received:', locationJson);
                     }
                 }

                setError(null); // Clear overall error on success

            } catch (err: any) {
                console.error('Error fetching real sensor data or location:', err);
                setError(`Failed to connect to sensor or get location for ${currentIp}: ${err.message}. Falling back to mock data.`);
                setLocationError('Failed to determine location.');
                // Fallback to mock sensor data
                const mockData = await getMockSensorData();
                setSensorData(mockData);
                setLocation(null); // No location for mock data
                setUsingMockData(true);
            } finally {
                setIsLoading(false);
                setLocationLoading(false);
            }
        } else {
            // Use mock sensor data if no IP is set
            try {
                const mockData = await getMockSensorData();
                setSensorData(mockData);
                setLocation(null); // No location for mock data
                setUsingMockData(true);
                setError(null);
                setLocationError('No sensor IP configured. Cannot determine location.');
            } catch (mockErr) {
                console.error('Error fetching mock sensor data:', mockErr);
                setError('Failed to fetch mock sensor data.');
                setLocationError('Failed to fetch location (no IP).');
                setSensorData(null);
            } finally {
                setIsLoading(false);
                setLocationLoading(false);
            }
        }
    }, [isClient, sensorIp]); // Depend on isClient and sensorIp

    // Fetch data on initial load and when sensorIp changes
    useEffect(() => {
        if (isClient) {
            fetchDataAndLocation();
        }
    }, [isClient, fetchDataAndLocation]); // Run when IP changes


    // Memoize the sensor icon
    const sensorIcon = useMemo(() => {
        if (!leafletLoaded || !sensorData) return null;
        return createCustomIcon(sensorData.temperature, 'primary', 35, 12);
    }, [leafletLoaded, sensorData]);

    // Callback ref to get the map instance
    const mapRefCb = useCallback((node: LeafletMap | null) => {
        if (node !== null) {
            mapRef.current = node;
             // Example: console.log('Map instance obtained:', node);
            // You can now interact with the map instance if needed, e.g., mapRef.current.flyTo(...)
        }
    }, []); // Empty dependency array means this callback doesn't change

    // --- Render Logic ---
    const renderMapContent = () => {
        if (!isClient || !leafletLoaded) {
            return <Skeleton className="w-full h-full rounded-b-lg" />;
        }

        // Decide initial center/zoom if location is still loading or failed
        const currentCenter = locationLoading && !location ? [20, 0] : (location || mapCenter);
        const currentZoom = locationLoading && !location ? 3 : (location ? 10 : mapZoom);


        return (
            <MapContainer
                center={currentCenter}
                zoom={currentZoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                className="rounded-b-lg z-0" // Ensure map is behind skeleton if skeleton shown
                whenCreated={mapRefCb} // Use whenCreated instead of ref
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Marker for Sensor Location */}
                {location && sensorIcon && (
                    <Marker position={location} icon={sensorIcon}>
                        <Popup>
                            <div className="p-1 text-sm">
                                <h4 className="font-semibold mb-1">Your Sensor</h4>
                                {sensorData?.temperature !== null && (
                                    <p className="text-xs flex items-center"><Thermometer className="inline h-3 w-3 mr-1 text-red-500" /> {sensorData?.temperature?.toFixed(1)}°C</p>
                                )}
                                {sensorData?.humidity !== null && (
                                     <p className="text-xs flex items-center"><MapPin className="inline h-3 w-3 mr-1 text-blue-500" /> {sensorData?.humidity?.toFixed(1)}%</p>
                                )}
                                {sensorIp && <p className="text-xs mt-1 text-muted-foreground">IP: {sensorIp}</p>}
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        );
    };


    return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
            <h1 className="text-3xl font-bold text-primary">Sensor Location Map</h1>

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {locationError && !error && ( // Show location error only if no general fetch error
                 <Alert variant="default" className="mb-4 border-orange-500 text-orange-800 dark:border-orange-400 dark:text-orange-300">
                    <WifiOff className="h-4 w-4 text-orange-600 dark:text-orange-400"/>
                    <AlertTitle>Location Unavailable</AlertTitle>
                    <AlertDescription>{locationError}</AlertDescription>
                 </Alert>
            )}
             {usingMockData && !error && (
                <Alert variant="default" className="mb-4 border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
                   <ServerCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                   <AlertTitle>Using Mock Data</AlertTitle>
                   <AlertDescription>
                     {sensorIp ? 'Could not connect to sensor or determine location. ' : 'No sensor IP configured. '}
                     Displaying mock sensor data. Location features are disabled. Go to <a href="/settings" className="underline font-medium">Settings</a> to configure your IP.
                   </AlertDescription>
                </Alert>
            )}


            <Card>
                <CardHeader>
                    <CardTitle>Live Map</CardTitle>
                    <CardDescription>
                        {location ? "Showing your sensor's approximate location based on its IP address." : "Map centered globally. Configure sensor IP to see its location."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] p-0 relative">
                    {/* Render map content (which includes skeleton if needed) */}
                    {renderMapContent()}
                     {/* Explicit Skeleton Overlay when loading */}
                     {isLoading && isClient && (
                       <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg z-10 bg-background/80 flex items-center justify-center">
                         <p className="text-muted-foreground">Loading Map & Sensor Data...</p>
                       </Skeleton>
                     )}
                </CardContent>
            </Card>

             {/* Simple Sensor Data Display */}
             <Card>
                <CardHeader>
                    <CardTitle>Sensor Data</CardTitle>
                     <CardDescription>Current readings from {usingMockData ? 'mock source' : `sensor at ${sensorIp || 'Unknown IP'}`}.</CardDescription>
                </CardHeader>
                <CardContent className="flex space-x-6">
                     <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Temperature</Label>
                        {isLoading ? <Skeleton className="h-6 w-16 mt-1 mx-auto" /> : <p className="text-xl font-bold">{sensorData?.temperature?.toFixed(1) ?? 'N/A'}°C</p>}
                     </div>
                    <div className="text-center">
                        <Label className="text-xs text-muted-foreground">Humidity</Label>
                         {isLoading ? <Skeleton className="h-6 w-16 mt-1 mx-auto" /> : <p className="text-xl font-bold">{sensorData?.humidity?.toFixed(1) ?? 'N/A'}%</p>}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
};

export default MapPage;
