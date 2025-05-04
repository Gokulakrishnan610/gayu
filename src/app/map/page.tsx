
'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Icon as LeafletIconType, Map as LeafletMap } from 'leaflet'; // Rename Icon to avoid conflict, import Map type

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LocateFixed, MapPin, Thermometer } from 'lucide-react';
import { getCityTemperature, CityTemperature } from '@/services/city-temperature';
import { getCurrentLocation, Location } from '@/services/location';
import { getSensorData, SensorData } from '@/services/sensor';

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const MapUpdater = dynamic(() => import('@/components/map-updater'), { ssr: false }); // Helper component to update map view


// Declare L variable to hold Leaflet instance when loaded
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

// Define custom Leaflet icons using L.divIcon for better styling control
const createCustomIcon = (
    temperature: number,
    color: 'primary' | 'accent',
    size: number = 32, // Default size
    fontSize: number = 11,
    textColor: 'primary-foreground' | 'accent-foreground' = 'accent-foreground'
): LeafletIconType | null => { // Return type updated
    // Ensure this only runs client-side
    if (typeof window === 'undefined' || !window.L) return null;

    const bgColorClass = color === 'primary' ? 'bg-primary' : 'bg-accent';
    const textColorClass = color === 'primary' ? 'text-primary-foreground' : 'text-accent-foreground';

    return window.L.divIcon({
        html: `<div class="${bgColorClass} ${textColorClass} rounded-full flex items-center justify-center shadow" style="width: ${size}px; height: ${size}px; font-size: ${fontSize}px; font-weight: bold;">${temperature.toFixed(0)}°</div>`,
        className: '', // Important to clear default Leaflet icon styles
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2], // Center the icon
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
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([20, 0]); // Default center for Leaflet
  const [mapZoom, setMapZoom] = useState(3); // Default zoom
  const [isClient, setIsClient] = useState(false); // Track if running on client
  const [leafletLoaded, setLeafletLoaded] = useState(false); // Track Leaflet loading separately
  const mapRef = useRef<LeafletMap | null>(null); // Ref to store the map instance

  const fetchCityTemperatures = useCallback(async () => {
    setLoadingCities(true);
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
      setError((prev) => prev || 'Failed to fetch city temperatures. Please try again later.');
    } finally {
      setLoadingCities(false);
    }
  }, []); // Empty dependency array

  const fetchSensorDataForLocation = useCallback(async (forceMock = false) => {
    setLoadingSensor(true); // Ensure loading sensor state is true at the start
    try {
        const storedIp = typeof window !== 'undefined' ? localStorage.getItem('sensorIp') : null; // Check window
        let sensorData: SensorData;
        let connectionError = null;

         if (storedIp && !forceMock) {
           try {
               const response = await fetch(`http://${storedIp}/data`);
               if (!response.ok) throw new Error('Failed to fetch from sensor IP');
               sensorData = await response.json();
           } catch (ipErr) {
               console.warn(`Failed fetching from ${storedIp}, using mock data.`, ipErr);
               sensorData = await getSensorData(); // Fallback to mock
               connectionError = 'Sensor connection failed.'; // Set specific error message
           }
        } else {
           sensorData = await getSensorData(); // Use mock if no IP or forced
        }

       // Basic validation
       const validatedData: SensorData = {
         temperature: typeof sensorData.temperature === 'number' ? sensorData.temperature : null,
         humidity: typeof sensorData.humidity === 'number' ? sensorData.humidity : null,
       };
        setUserSensorData(validatedData);
         if (connectionError) {
             setError((prev) => prev ? `${prev} ${connectionError}` : connectionError);
         }
     } catch (sensorErr) {
       console.error('Error fetching sensor data:', sensorErr);
       setError((prev) => prev ? `${prev} Failed to fetch sensor data.` : 'Failed to fetch sensor data.');
        try {
           const mockSensorData = await getSensorData(); // Fallback to mock on error
            setUserSensorData(mockSensorData);
        } catch (mockErr) {
             console.error('Failed fetching mock sensor data:', mockErr);
             setUserSensorData({ temperature: null, humidity: null });
        }
     } finally {
       setLoadingSensor(false); // Sensor attempt finished
     }
 }, []); // Empty dependency array

  const fetchLocationAndSensorFromAPI = useCallback(async () => {
    // Try fetching location from API
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setMapCenter([location.lat, location.lng]);
      setMapZoom(10);
    } catch (locError) {
        console.error('Error fetching location from API:', locError);
        setError((prev) => prev ? `${prev} Failed to retrieve location.` : 'Failed to retrieve location.');
    } finally {
        setLoadingLocation(false); // Location attempt (geo or API) finished
    }

    // Always attempt to fetch sensor data after location attempt (success or fail)
    await fetchSensorDataForLocation();
  }, [fetchSensorDataForLocation]); // Add dependency


 const fetchUserLocationAndSensor = useCallback(async () => {
    setLoadingLocation(true);
    setLoadingSensor(true);

    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location: Location = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation(location);
            setMapCenter([location.lat, location.lng]);
            setMapZoom(10);
            setLoadingLocation(false);
            await fetchSensorDataForLocation(); // Fetch sensor after getting location
          },
          async (geoError) => {
            console.warn('Geolocation error:', geoError.message, 'Falling back to API.');
            await fetchLocationAndSensorFromAPI(); // Fallback includes sensor fetch
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        console.warn('Geolocation not supported, falling back to API.');
        await fetchLocationAndSensorFromAPI(); // Fallback includes sensor fetch
      }
    } catch (err) {
       console.error('General error fetching location/sensor:', err);
       setError((prev) => prev || 'Failed to determine your location or fetch sensor data.');
       setLoadingLocation(false); // Ensure loading states are updated on error
       setLoadingSensor(false);
        // Attempt to load mock sensor data even if location fails
        await fetchSensorDataForLocation(true); // Force mock data fetch
    }
  }, [fetchSensorDataForLocation, fetchLocationAndSensorFromAPI]); // Add dependencies


  useEffect(() => {
    setIsClient(true); // Indicate we are now on the client

    let didInit = false; // Flag to track initialization

    const loadLeaflet = async () => {
        if (typeof window !== 'undefined' && !window.L && !didInit) {
            didInit = true; // Mark as attempting initialization
            try {
                const leaflet = await import('leaflet');
                window.L = leaflet;

                if (window.L) {
                    // Check if Default icon prototype exists before trying to modify it
                    if (window.L.Icon.Default?.prototype) {
                        delete (window.L.Icon.Default.prototype as any)._getIconUrl;
                        window.L.Icon.Default.mergeOptions({
                            iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
                            iconUrl: '/_next/static/media/marker-icon.png',
                            shadowUrl: '/_next/static/media/marker-shadow.png',
                        });
                    } else {
                        console.warn("L.Icon.Default.prototype not found. Skipping icon path merge.");
                    }


                    // Dynamically import compatibility script client-side ONLY after L is defined
                    await import('leaflet-defaulticon-compatibility');
                    setLeafletLoaded(true); // Mark Leaflet as fully loaded
                    console.log("Leaflet and compatibility loaded successfully.");

                    // Fetch data only after Leaflet is ready
                    fetchCityTemperatures();
                    fetchUserLocationAndSensor();

                } else {
                     console.error("Leaflet (L) failed to attach to window.");
                     setError("Map components failed to load properly.");
                     setLoadingCities(false); setLoadingLocation(false); setLoadingSensor(false);
                }
            } catch (error) {
                console.error("Failed to load Leaflet or compatibility script:", error);
                setError("Map components could not be loaded.");
                setLoadingCities(false); setLoadingLocation(false); setLoadingSensor(false);
            }
        } else if (typeof window !== 'undefined' && window.L && leafletLoaded) {
             // Already loaded, fetch data if necessary (e.g., on page navigation)
            if (cityTemperatures.length === 0) fetchCityTemperatures();
            if (!userLocation || !userSensorData) fetchUserLocationAndSensor();
        }
    };

    // Execute loading logic only once on mount
    if (!leafletLoaded) {
       loadLeaflet();
    }


    // Cleanup function: Enhanced to prevent errors in Strict Mode
    return () => {
       console.log("MapPage cleanup triggered.");
       const currentMap = mapRef.current;
       if (currentMap) {
           console.log("Attempting to remove map instance during cleanup.");
           try {
               // Check if the container associated with the map instance still exists
               // This helps avoid errors if the DOM node was already removed by React
               const container = currentMap.getContainer();
               if (container && container.parentNode) {
                   currentMap.remove(); // Cleanly remove the map instance
                   console.log("Map instance removed successfully.");
               } else {
                   console.log("Map container not found or already removed from DOM. Skipping remove().");
               }
           } catch (e) {
               console.warn("Error removing map instance:", e);
           } finally {
               // Only nullify the ref if it points to the instance we tried to remove
               if (mapRef.current === currentMap) {
                   mapRef.current = null;
                   console.log("Map instance reference set to null.");
               }
           }
       } else {
            console.log("No map instance found in ref during cleanup.");
       }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded, fetchCityTemperatures, fetchUserLocationAndSensor]); // Dependencies ensure leaflet loading logic runs correctly


  const temperatureDifference = useMemo(() => {
    if (!userLocation || !userSensorData || cityTemperatures.length === 0 || userSensorData.temperature === null) return null;

    let nearestCity: CityData | null = null;
    let minDistance = Infinity;

    cityTemperatures.forEach(city => {
      if (!userLocation) return;
      const distance = Math.sqrt(
        Math.pow(userLocation.lat - city.lat, 2) + Math.pow(userLocation.lng - city.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    if (!nearestCity || !userSensorData || userSensorData.temperature === null) return null;

    const diff = userSensorData.temperature - nearestCity.temperature;
    return {
      city: nearestCity.name,
      difference: diff.toFixed(1),
      comparison: diff > 0 ? 'warmer' : diff < 0 ? 'cooler' : 'similar',
    };
  }, [userLocation, userSensorData, cityTemperatures]);

  // Memoize icons to prevent recreation on every render
    const cityIcons = useMemo(() => {
      if (!isClient || !window.L || !leafletLoaded) return {}; // Ensure client-side and Leaflet loaded
      return cityTemperatures.reduce((acc, city) => {
          const icon = createCustomIcon(city.temperature, 'accent', 30, 10);
          if (icon) {
            acc[city.city] = icon;
          }
          return acc;
      }, {} as Record<string, LeafletIconType>);
  }, [cityTemperatures, leafletLoaded, isClient]); // Add isClient dependency

  const userIcon = useMemo(() => {
      if (!isClient || !userSensorData || userSensorData.temperature === null || !window.L || !leafletLoaded) return null; // Check client, data, L, and leafletLoaded
      return createCustomIcon(userSensorData.temperature, 'primary', 36, 12, 'primary-foreground');
  }, [userSensorData, leafletLoaded, isClient]); // Add isClient dependency

  const isLoading = loadingCities || loadingLocation || loadingSensor; // Removed !leafletLoaded here, handle rendering separately

  // Render skeleton or minimal UI until client-side hydration and Leaflet loaded
  const renderMapOrSkeleton = () => {
     if (!isClient || !leafletLoaded) {
       return (
          <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg bg-muted/80 flex items-center justify-center">
              <p>Loading Map...</p>
          </Skeleton>
       );
     }

     // Only render MapContainer if not loading and on client + leaflet loaded
     return (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="w-full h-full rounded-b-lg z-0"
            style={{ backgroundColor: 'hsl(var(--muted))' }} // Match background
             whenCreated={(mapInstance) => {
                 // Only assign to ref if it's currently null (to avoid issues in Strict Mode)
                 if (!mapRef.current) {
                     mapRef.current = mapInstance;
                     console.log("Map instance created and assigned to ref.");
                 } else {
                      console.log("Map instance already exists in ref, skipping assignment.");
                      // If an instance already exists, ensure the new one is cleaned up immediately
                      // This might happen in StrictMode's double-render
                      // try {
                      //     mapInstance.remove();
                      //     console.log("Removed duplicate map instance.");
                      // } catch (e) {
                      //     console.warn("Error removing duplicate map instance:", e);
                      // }
                 }
             }}
             // whenReady is often more reliable than whenCreated for setup
            // whenReady={(mapInstance) => { /* Potentially move some logic here */ }}
          >
             <MapUpdater center={mapCenter} zoom={mapZoom} />
             <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
               url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
             />

              {/* City Markers */}
              {cityTemperatures.map((city) => (
                cityIcons[city.city] ? ( // Ensure icon exists
                    <Marker
                      key={city.city}
                      position={[city.lat, city.lng]}
                      icon={cityIcons[city.city]}
                    >
                        <Popup>
                            <div className="p-1">
                              <h4 className="font-semibold text-sm mb-1">{city.city}</h4>
                              <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{city.temperature.toFixed(1)}°C</p>
                            </div>
                        </Popup>
                    </Marker>
                ) : ( // Use default Leaflet marker if custom icon failed
                  <Marker key={city.city} position={[city.lat, city.lng]}>
                       <Popup>
                            <div className="p-1">
                              <h4 className="font-semibold text-sm mb-1">{city.city}</h4>
                              <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{city.temperature.toFixed(1)}°C</p>
                            </div>
                        </Popup>
                  </Marker>
                )
              ))}

             {/* User Location Marker */}
              {userLocation && userSensorData && userSensorData.temperature !== null && userIcon && (
                  <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={userIcon}
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
               {userLocation && userSensorData && (!userIcon || userSensorData.temperature === null) && window.L && ( // Check window.L here too
                   <Marker position={[userLocation.lat, userLocation.lng]}>
                      <Popup>
                        <div className="p-1">
                          <h4 className="font-semibold text-sm mb-1">Your Location</h4>
                          <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{userSensorData.temperature?.toFixed(1) ?? 'N/A'}°C</p>
                        </div>
                    </Popup>
                   </Marker>
               )}

                {/* Conditional Skeleton Overlay for Data Loading (covers map if already rendered) */}
              {isLoading && ( // Show loading overlay if any data is still loading, even if map container rendered
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
            {loadingLocation || loadingSensor ? ( // Keep skeleton here as before
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
