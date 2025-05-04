'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Icon as LeafletIconType, Map as LeafletMap } from 'leaflet';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LocateFixed, Thermometer, Droplets } from 'lucide-react'; // Added Droplets
import { getCurrentLocation, Location } from '@/services/location';
import { getSensorData, SensorData } from '@/services/sensor';

// Dynamically import react-leaflet components with ssr: false
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false, loading: () => <Skeleton className="w-full h-full" /> });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const MapUpdater = dynamic(() => import('@/components/map-updater'), { ssr: false });

// Declare global L variable - necessary for custom icon creation method
declare global {
    interface Window {
      L: typeof import('leaflet') | undefined;
    }
}

// Client-side icon creation function - Simplified for single marker
const createCustomIcon = (
  temperature: number | null,
  color: 'primary' | 'accent',
  size: number = 36,
  fontSize: number = 11,
  textColor: 'primary-foreground' | 'accent-foreground' = 'primary-foreground'
): LeafletIconType | null => {
  if (typeof window === 'undefined' || !window.L) return null;

  const L = window.L;
  const bgColorClass = color === 'primary' ? 'bg-primary' : 'bg-accent';
  const textColorClass = color === 'primary' ? 'text-primary-foreground' : 'text-accent-foreground';
  const displayValue = temperature !== null ? `${temperature.toFixed(0)}°` : '?';

  return L.divIcon({
    html: `<div class="${bgColorClass} ${textColorClass} rounded-full flex items-center justify-center shadow" style="width: ${size}px; height: ${size}px; font-size: ${fontSize}px; font-weight: bold;">${displayValue}</div>`,
    className: '', // Important: prevent default leaflet styles interfering
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MapPage: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [userSensorData, setUserSensorData] = useState<SensorData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingSensor, setLoadingSensor] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([20, 0]); // Default center
  const [mapZoom, setMapZoom] = useState(3); // Default zoom
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [userIconState, setUserIconState] = useState<LeafletIconType | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);


  const fetchSensorDataForLocation = useCallback(async (forceMock = false) => {
    setLoadingSensor(true);
    try {
      const storedIp = typeof window !== 'undefined' ? localStorage.getItem('sensorIp') : null;
      let sensorData: SensorData;
      let connectionError = null;

      if (storedIp && !forceMock) {
        try {
          const response = await fetch(`http://${storedIp}/data`);
          if (!response.ok) throw new Error('Failed to fetch from sensor IP');
          sensorData = await response.json();
        } catch (ipErr) {
          console.warn(`Failed fetching from ${storedIp}, using mock data.`, ipErr);
          sensorData = await getSensorData(); // Use mock on direct IP fetch error
          connectionError = 'Sensor connection failed.';
        }
      } else {
         console.log(forceMock ? 'Forcing mock sensor data fetch.' : 'No sensor IP, using mock data.');
         sensorData = await getSensorData(); // Use mock if no IP or forced
         if (!storedIp) {
            connectionError = 'No sensor IP configured.';
         }
      }

      const validatedData: SensorData = {
        temperature: typeof sensorData.temperature === 'number' ? sensorData.temperature : null,
        humidity: typeof sensorData.humidity === 'number' ? sensorData.humidity : null,
      };
      setUserSensorData(validatedData);
      if (connectionError) {
         setError((prev) => {
             const newError = connectionError || '';
             if (!prev) return newError;
             return prev.includes(newError) ? prev : `${prev} ${newError}`;
         });
      }
    } catch (sensorErr) {
      console.error('Error fetching sensor data:', sensorErr);
      setError((prev) => prev ? `${prev} Failed to fetch sensor data.` : 'Failed to fetch sensor data.');
      try {
        console.log('Fetching mock sensor data due to general sensor error.');
        const mockSensorData = await getSensorData();
         setUserSensorData(mockSensorData);
      } catch (mockErr){
           console.error('Failed fetching mock sensor data:', mockErr);
           setUserSensorData({ temperature: null, humidity: null }); // Set to null on final fallback
       }
    } finally {
      setLoadingSensor(false);
    }
  }, []);


   const fetchLocationAndSensorFromAPI = useCallback(async () => {
    setLoadingLocation(true); // Start location loading
    try {
      const location = await getCurrentLocation(); // Using mock/API location
      setUserLocation(location);
      setMapCenter([location.lat, location.lng]);
      setMapZoom(10); // Zoom in on API-based location
    } catch (locError) {
      console.error('Error fetching location from API:', locError);
      setError((prev) => prev ? `${prev} Failed to retrieve location.` : 'Failed to retrieve location.');
      // Keep map at default view if location fails
    } finally {
      setLoadingLocation(false); // Finish location loading
    }

    // Fetch sensor data regardless of location success/failure
    await fetchSensorDataForLocation();
  }, [fetchSensorDataForLocation]);


  const fetchUserLocationAndSensor = useCallback(async () => {
    setLoadingLocation(true);
    setLoadingSensor(true);
    setError(null); // Clear previous errors

    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location: Location = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation(location);
            setMapCenter([location.lat, location.lng]);
            setMapZoom(13); // Zoom in closer for accurate geolocation
            setLoadingLocation(false); // Geolocation success
            await fetchSensorDataForLocation(); // Fetch sensor after getting location
          },
          async (geoError) => {
            console.warn('Geolocation error:', geoError.message, 'Falling back to API location.');
            await fetchLocationAndSensorFromAPI();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 } // Higher accuracy
        );
      } else {
        console.warn('Geolocation not supported, falling back to API location.');
        await fetchLocationAndSensorFromAPI();
      }
    } catch (err) {
      console.error('General error in fetchUserLocationAndSensor:', err);
      setError((prev) => prev || 'Failed to determine location or fetch sensor data.');
      setLoadingLocation(false);
      setLoadingSensor(false);
      await fetchSensorDataForLocation(true); // Force mock data on general error
    }
  }, [fetchSensorDataForLocation, fetchLocationAndSensorFromAPI]);

  // Effect 1: Set isClient to true on component mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Effect 2: Load Leaflet library and compatibility scripts client-side
  useEffect(() => {
    if (!isClient) return;

    const loadLeaflet = async () => {
        if (typeof window !== 'undefined' && !window.L) {
          const L = (await import('leaflet')).default;
          window.L = L;

          // Apply compatibility fixes *after* L is assigned
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
             // Use relative paths that CopyPlugin makes available
             iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
             iconUrl: '/_next/static/media/marker-icon.png',
             shadowUrl: '/_next/static/media/marker-shadow.png',
          });

          await import('leaflet-defaulticon-compatibility');

          setLeafletLoaded(true);
          console.log("Leaflet and compatibility script loaded successfully.");
        } else if (typeof window !== 'undefined' && window.L && !leafletLoaded) {
             setLeafletLoaded(true);
             console.log("Leaflet already loaded, ensuring state is set.");
        }
    };

     if (!leafletLoaded) {
        loadLeaflet().catch(error => {
            console.error("Failed during Leaflet loading process:", error);
             setError((prev) => prev ? `${prev} Map components failed to load.` : "Map components failed to load.");
        });
     }

  }, [isClient, leafletLoaded]);

  // Effect 3: Fetch data *only* after Leaflet is loaded client-side
  useEffect(() => {
    if (isClient && leafletLoaded) {
      console.log("Leaflet loaded, fetching initial map data.");
      fetchUserLocationAndSensor();
    }
  }, [isClient, leafletLoaded, fetchUserLocationAndSensor]); // Added fetchUserLocationAndSensor dependency

  // Effect 4: Update user icon when sensor data or Leaflet state changes
  useEffect(() => {
    if (isClient && leafletLoaded) {
      // Use temperature from userSensorData, can be null
      const icon = createCustomIcon(userSensorData?.temperature ?? null, 'primary');
      setUserIconState(icon);
    }
  }, [userSensorData, isClient, leafletLoaded]);

  // Effect 5: Cleanup map instance on component unmount
  useEffect(() => {
    // Return a cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove(); // Properly remove the map instance
        mapRef.current = null;
        console.log("Leaflet map instance removed.");
      }
    };
  }, []); // Empty dependency array ensures this runs only on unmount

  // Callback ref to get the map instance
  const mapRefCb = useCallback((node: LeafletMap | null) => {
    if (node !== null) {
      // Prevent re-initializing if ref callback is called again by React StrictMode
      if (!mapRef.current) {
        mapRef.current = node;
        console.log("Leaflet map instance obtained.");
      }
    }
  }, []);

  const isLoading = loadingLocation || loadingSensor;

  // Render map content (marker, popup, etc.)
  const renderMapContent = () => {
    if (!TileLayer || !Marker || !Popup || !MapUpdater) {
      return null;
    }

    return (
      <>
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* User Location Marker */}
        {userLocation ? (
          <Marker
            key="user-location"
            position={[userLocation.lat, userLocation.lng]}
            icon={userIconState ?? undefined} // Use custom icon or fallback to default
          >
            <Popup>
              <div className="p-1">
                <h4 className="font-semibold text-sm mb-1">Your Location</h4>
                <p className="text-xs flex items-center gap-1 mb-0.5">
                  <Thermometer className="h-3 w-3" />
                  Temp: {userSensorData?.temperature?.toFixed(1) ?? 'N/A'}°C
                </p>
                <p className="text-xs flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  Humidity: {userSensorData?.humidity?.toFixed(1) ?? 'N/A'}%
                </p>
              </div>
            </Popup>
          </Marker>
        ) : null}
      </>
    );
  };

  // Main render structure
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-primary">Sensor Location Map</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sensor Map</CardTitle>
            <CardDescription>Your sensor's location and current readings.</CardDescription>
          </CardHeader>
          <CardContent className="h-[500px] p-0 relative">
             {/* Conditionally render MapContainer only when on client and leaflet is loaded */}
             {isClient && leafletLoaded && MapContainer ? (
                 <MapContainer
                   ref={mapRefCb} // Use the callback ref to get the instance
                   center={mapCenter}
                   zoom={mapZoom}
                   scrollWheelZoom={true}
                   className="w-full h-full z-0"
                   style={{ backgroundColor: 'hsl(var(--muted))' }}
                 >
                   {renderMapContent()}
                 </MapContainer>
             ) : (
               // Show skeleton if not client-side or leaflet not loaded
               <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted/80 rounded-b-lg">
                 <Skeleton className="w-full h-full">
                   <p className="text-center p-4">Loading Map...</p>
                 </Skeleton>
               </div>
             )}
             {/* Conditional Skeleton Overlay during data loading (if map is already rendered) */}
             {isClient && leafletLoaded && isLoading && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted/80 rounded-b-lg z-10">
                   <Skeleton className="w-full h-full">
                      <p className="text-center p-4">Fetching Sensor Data...</p>
                   </Skeleton>
                </div>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensor Details</CardTitle>
            <CardDescription>Your current sensor readings.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLocation || loadingSensor ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                 <Skeleton className="h-4 w-1/2" />
              </div>
            ) : userLocation && userSensorData ? (
              <div className="space-y-3">
                <p className="flex items-center gap-2">
                  <LocateFixed className="h-5 w-5 text-primary" />
                  <span className="text-sm">
                    {userLocation.lat ? `Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}` : 'Location unavailable'}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-accent" />
                  <span className="font-semibold">{userSensorData.temperature?.toFixed(1) ?? 'N/A'}°C</span>
                  <span className="text-sm text-muted-foreground">(Sensor Temp)</span>
                </p>
                <p className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                   <span className="font-semibold">{userSensorData.humidity?.toFixed(1) ?? 'N/A'}%</span>
                   <span className="text-sm text-muted-foreground">(Sensor Humidity)</span>
                </p>
                 <p className="text-xs text-muted-foreground pt-2">
                     Sensor IP: {localStorage.getItem('sensorIp') || 'Not Configured (Using Mock)'}
                 </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Could not retrieve location or sensor data.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MapPage;
