// src/app/map/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Icon as LeafletIconType, Map as LeafletMap } from 'leaflet';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LocateFixed, MapPin, Thermometer } from 'lucide-react';
import { getCityTemperature, CityTemperature } from '@/services/city-temperature';
import { getCurrentLocation, Location } from '@/services/location';
import { getSensorData, SensorData } from '@/services/sensor';

// Dynamically import react-leaflet components with ssr: false
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const MapUpdater = dynamic(() => import('@/components/map-updater'), { ssr: false });

// Declare global L variable
declare global {
    interface Window {
      L: typeof import('leaflet') | undefined;
    }
}

interface CityData extends CityTemperature {
  lat: number;
  lng: number;
}

// Predefined cities with approximate coordinates
const CITIES = [
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo', lat: 35.6895, lng: 139.6917 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357 },
];

// Move custom icon creation to client-side only execution
const createCustomIcon = (
  temperature: number,
  color: 'primary' | 'accent',
  size: number = 32,
  fontSize: number = 11,
  textColor: 'primary-foreground' | 'accent-foreground' = 'accent-foreground'
): LeafletIconType | null => {
  // Only run if Leaflet is available
  if (typeof window === 'undefined' || !window.L) return null;

  const bgColorClass = color === 'primary' ? 'bg-primary' : 'bg-accent';
  const textColorClass = color === 'primary' ? 'text-primary-foreground' : 'text-accent-foreground';

  return window.L.divIcon({
    html: `<div class="${bgColorClass} ${textColorClass} rounded-full flex items-center justify-center shadow" style="width: ${size}px; height: ${size}px; font-size: ${fontSize}px; font-weight: bold;">${temperature.toFixed(0)}°</div>`,
    className: '', // Important: prevent default leaflet styles interfering
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const MapPage: React.FC = () => {
  const [cityTemperatures, setCityTemperatures] = useState<CityData[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [userSensorData, setUserSensorData] = useState<SensorData | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingSensor, setLoadingSensor] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([20, 0]);
  const [mapZoom, setMapZoom] = useState(3);
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null); // Ref to hold the map instance

  // City and user icon states - need to be created client-side only
  const [cityIconsState, setCityIconsState] = useState<Record<string, LeafletIconType>>({});
  const [userIconState, setUserIconState] = useState<LeafletIconType | null>(null);


  const fetchCityTemperatures = useCallback(async () => {
    setLoadingCities(true);
    setError(null); // Clear previous errors
    try {
      const temperaturePromises = CITIES.map(city => getCityTemperature(city.name));
      const results = await Promise.all(temperaturePromises);
      const dataWithCoords = results.map((tempData, index) => ({
        ...tempData,
        lat: CITIES[index].lat,
        lng: CITIES[index].lng,
      }));
      setCityTemperatures(dataWithCoords);
    } catch (err) {
      console.error('Error fetching city temperatures:', err);
      setError((prev) => prev ? `${prev} Failed to fetch city temperatures.` : 'Failed to fetch city temperatures.');
    } finally {
      setLoadingCities(false);
    }
  }, []);

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
         // Append connection error, avoiding duplicate messages
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
  }, []); // Removed error from dependencies to avoid loops

  const fetchLocationAndSensorFromAPI = useCallback(async () => {
    setLoadingLocation(true); // Start location loading
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setMapCenter([location.lat, location.lng]);
      setMapZoom(10);
    } catch (locError) {
      console.error('Error fetching location from API:', locError);
      setError((prev) => prev ? `${prev} Failed to retrieve location.` : 'Failed to retrieve location.');
      // Don't set userLocation, keep it null or previous value if any
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
            setMapZoom(10);
            setLoadingLocation(false); // Geolocation success
            await fetchSensorDataForLocation(); // Fetch sensor after getting location
          },
          async (geoError) => {
            console.warn('Geolocation error:', geoError.message, 'Falling back to API.');
            // Error handled by fetchLocationAndSensorFromAPI
            await fetchLocationAndSensorFromAPI();
            // setLoadingLocation(false) is handled within fetchLocationAndSensorFromAPI
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        console.warn('Geolocation not supported, falling back to API.');
        await fetchLocationAndSensorFromAPI();
        // setLoadingLocation(false) is handled within fetchLocationAndSensorFromAPI
      }
    } catch (err) {
      // This catch block might be less necessary now errors are handled within the specific fetchers
      console.error('General error in fetchUserLocationAndSensor:', err);
      setError((prev) => prev || 'Failed to determine location or fetch sensor data.');
      setLoadingLocation(false); // Ensure loading stops on unexpected error
      setLoadingSensor(false);
      await fetchSensorDataForLocation(true); // Force mock data on general error
    }
  }, [fetchSensorDataForLocation, fetchLocationAndSensorFromAPI]);

   // First useEffect: Handle client-side detection
   useEffect(() => {
       setIsClient(true);
   }, []);


   // Second useEffect: Load Leaflet library and icons when client-side
   useEffect(() => {
       if (!isClient) return; // Only run on client

       let leafletImported = false;

       const loadLeaflet = async () => {
           if (typeof window !== 'undefined' && !window.L) {
               try {
                   const leaflet = await import('leaflet');
                   window.L = leaflet;

                   // Apply compatibility fixes for default icons *after* L is assigned
                   delete (window.L.Icon.Default.prototype as any)._getIconUrl;
                   window.L.Icon.Default.mergeOptions({
                       iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
                       iconUrl: '/_next/static/media/marker-icon.png',
                       shadowUrl: '/_next/static/media/marker-shadow.png',
                   });

                   // Import compatibility script only after Leaflet and fixes are loaded
                   await import('leaflet-defaulticon-compatibility');
                   leafletImported = true;
                   setLeafletLoaded(true); // Mark Leaflet as fully loaded
                   console.log("Leaflet and compatibility script loaded successfully.");

               } catch (error) {
                   console.error("Failed to load Leaflet or compatibility script:", error);
                   setError((prev) => prev ? `${prev} Map components failed to load.` : "Map components failed to load.");
                   setLoadingCities(false); // Stop loading indicators if Leaflet fails
                   setLoadingLocation(false);
                   setLoadingSensor(false);
               }
           } else if (typeof window !== 'undefined' && window.L && !leafletLoaded) {
               // Leaflet might exist from a previous render (Strict Mode) but wasn't marked as loaded
               try {
                   await import('leaflet-defaulticon-compatibility'); // Ensure compatibility is run
                   leafletImported = true;
                   setLeafletLoaded(true); // Mark as loaded
                   console.log("Leaflet compatibility ensured on subsequent render.");
               } catch (error) {
                   console.error("Failed to ensure Leaflet compatibility script (retry):", error);
                    setError((prev) => prev ? `${prev} Map components failed to load.` : "Map components failed to load.");
               }
           } else if (leafletLoaded) {
                leafletImported = true; // Already loaded
           }
       };

        loadLeaflet(); // Execute the load function

       // Cleanup function for map instance - runs ONLY when the component unmounts
       return () => {
           if (mapRef.current) {
               console.log("Attempting to remove map instance on component unmount.");
               try {
                   mapRef.current.off(); // Unbind all event listeners
                   mapRef.current.remove(); // Clean up the Leaflet map instance
                   mapRef.current = null; // Explicitly nullify the ref
                   console.log("Map instance removed successfully on unmount.");
               } catch (e) {
                   console.warn("Error removing map during unmount cleanup:", e);
               }
           }
       };
    // Dependency only on isClient ensures this runs once when client becomes true
   }, [isClient]);


   // Third useEffect: Fetch data *only* after Leaflet is loaded
   useEffect(() => {
       if (isClient && leafletLoaded) {
           console.log("Leaflet loaded, fetching initial map data.");
           fetchCityTemperatures();
           fetchUserLocationAndSensor();
       }
       // Intentionally NOT depending on fetch functions to run only once after load
   }, [isClient, leafletLoaded]); // Trigger data fetch when leaflet is ready


   // Fourth useEffect: Update icons when data or Leaflet state changes
   useEffect(() => {
       // Only create icons on the client when Leaflet is fully loaded
       if (isClient && leafletLoaded && window.L) {
            console.log("Updating map icons based on data change.");
           // Create city icons
           const icons = cityTemperatures.reduce((acc, city) => {
               const icon = createCustomIcon(city.temperature, 'accent', 30, 10);
               if (icon) {
                   acc[city.city] = icon;
               }
               return acc;
           }, {} as Record<string, LeafletIconType>);
           setCityIconsState(icons);

           // Create user icon
           if (userSensorData && userSensorData.temperature !== null) {
               const icon = createCustomIcon(userSensorData.temperature, 'primary', 36, 12, 'primary-foreground');
               setUserIconState(icon);
           } else {
               setUserIconState(null); // Reset if no temp data
           }
       }
   }, [cityTemperatures, userSensorData, isClient, leafletLoaded]); // Depend on data and leaflet state


  const temperatureDifference = useMemo(() => {
    if (!userLocation || !userSensorData || cityTemperatures.length === 0 || userSensorData.temperature === null) return null;

    let nearestCity: CityData | null = null;
    let minDistance = Infinity;

    cityTemperatures.forEach(city => {
      if (!userLocation) return; // Should not happen if userLocation is checked, but good practice
      // Simple distance calculation (consider Haversine for real-world accuracy)
      const distance = Math.sqrt(
        Math.pow(userLocation.lat - city.lat, 2) + Math.pow(userLocation.lng - city.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    // Check if nearestCity was found and userSensorData is valid
    if (!nearestCity || !userSensorData || userSensorData.temperature === null) return null;

    const diff = userSensorData.temperature - nearestCity.temperature;
    return {
      city: nearestCity.name,
      difference: diff.toFixed(1),
      comparison: diff > 0 ? 'warmer' : diff < 0 ? 'cooler' : 'similar',
    };
  }, [userLocation, userSensorData, cityTemperatures]);

  const isLoading = loadingCities || loadingLocation || loadingSensor;


  // Render skeleton or map based on loading state and client/leaflet readiness
  const renderMapOrSkeleton = () => {
    // Show initial skeleton on server or before client/leaflet is ready
    if (!isClient || !leafletLoaded) {
        console.log("Rendering Initial Skeleton: isClient =", isClient, ", leafletLoaded =", leafletLoaded);
        return (
            <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg bg-muted/80 flex items-center justify-center">
            <p>Loading Map...</p>
            </Skeleton>
        );
    }

     // On the client, always render the MapContainer, but overlay a skeleton if data is loading
     // Use the `whenCreated` prop to get the map instance and store it in the ref
     // Avoid using the `ref` prop directly on MapContainer as it can cause issues with dynamic imports and StrictMode
     return (
           <MapContainer
             center={mapCenter}
             zoom={mapZoom}
             scrollWheelZoom={true}
             className="w-full h-full rounded-b-lg z-0"
             style={{ backgroundColor: 'hsl(var(--muted))' }}
             whenCreated={mapInstance => {
                 // Store the map instance in the ref.
                 // Avoid re-initializing if the ref already holds a map instance.
                 // This helps mitigate the "Map container is already initialized" error, especially in Strict Mode.
                 if (!mapRef.current) {
                    mapRef.current = mapInstance;
                    console.log("Map instance assigned via whenCreated.");
                 } else {
                    console.log("Map instance already exists in ref, skipping assignment.");
                    // Optionally update view if needed, though MapUpdater should handle it
                    // mapRef.current.setView(mapCenter, mapZoom);
                 }
             }}
           >
             <MapUpdater center={mapCenter} zoom={mapZoom} />
             <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
               url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
             />

             {/* City Markers */}
             {cityTemperatures.map((city) => (
                 cityIconsState[city.city] ? (
                     <Marker
                         key={city.city}
                         position={[city.lat, city.lng]}
                         icon={cityIconsState[city.city]}
                     >
                         <Popup>
                             <div className="p-1">
                             <h4 className="font-semibold text-sm mb-1">{city.city}</h4>
                             <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{city.temperature.toFixed(1)}°C</p>
                             </div>
                         </Popup>
                     </Marker>
                 ) : ( // Fallback default marker if custom icon fails for a city
                      <Marker key={city.city} position={[city.lat, city.lng]}>
                           <Popup>
                                <div className="p-1">
                                <h4 className="font-semibold text-sm mb-1">{city.city}</h4>
                                <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{city.temperature?.toFixed(1) ?? 'N/A'}°C</p> {/* Handle potential null temp */}
                                </div>
                           </Popup>
                      </Marker>
                 )
             ))}

              {/* User Location Marker */}
              {userLocation && userSensorData && userSensorData.temperature !== null && userIconState && (
                 <Marker
                    key="user-location-marker" // Add a key
                    position={[userLocation.lat, userLocation.lng]}
                    icon={userIconState}
                 >
                    <Popup>
                        <div className="p-1">
                        <h4 className="font-semibold text-sm mb-1">Your Location</h4>
                        <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{userSensorData.temperature.toFixed(1)}°C</p>
                        </div>
                    </Popup>
                 </Marker>
              )}

              {/* Fallback default marker for user if custom icon fails or temp is null */}
              {userLocation && (!userIconState || (userSensorData && userSensorData.temperature === null)) && (
                 <Marker key="user-location-fallback" position={[userLocation.lat, userLocation.lng]}>
                     <Popup>
                         <div className="p-1">
                         <h4 className="font-semibold text-sm mb-1">Your Location</h4>
                         <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{userSensorData?.temperature?.toFixed(1) ?? 'N/A'}°C</p>
                         </div>
                     </Popup>
                 </Marker>
              )}

             {/* Loading overlay - Displayed when actively fetching data */}
             {isLoading && (
               <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg z-10 bg-muted/80 flex items-center justify-center">
                 <p>Updating Data...</p>
               </Skeleton>
             )}
           </MapContainer>
     );
   };


  // Main render structure
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-primary">Global Temperature Map</h1>

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
            <CardTitle>Temperature Overview</CardTitle>
            <CardDescription>Temperatures around the world and your location.</CardDescription>
          </CardHeader>
          <CardContent className="h-[500px] p-0 relative">
              {renderMapOrSkeleton()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Location Details</CardTitle>
            <CardDescription>Your current sensor readings and comparison.</CardDescription>
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
                  <span className="text-sm text-muted-foreground">(Your Sensor)</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  {temperatureDifference ? (
                    <span className="text-sm">
                      {Math.abs(parseFloat(temperatureDifference.difference))}°C {temperatureDifference.comparison} than {temperatureDifference.city}.
                    </span>
                  ) : userSensorData.temperature === null ? (
                    <span className="text-sm text-muted-foreground">Comparison unavailable (sensor error).</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Comparing data...</span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Could not retrieve your location or sensor data.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MapPage;
