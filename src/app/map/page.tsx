
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Icon as LeafletIconType } from 'leaflet'; // Rename Icon to avoid conflict
// Removed: import 'leaflet-defaulticon-compatibility'; // Import the JS part

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

// Import Leaflet library dynamically on the client-side
let L: typeof import('leaflet') | null = null;

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
    if (!L) return null; // Return null if Leaflet is not loaded

    const bgColorClass = color === 'primary' ? 'bg-primary' : 'bg-accent';
    const textColorClass = color === 'primary' ? 'text-primary-foreground' : 'text-accent-foreground';

    return L.divIcon({
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
  const [mapInstanceKey, setMapInstanceKey] = useState(0); // Key to force MapContainer re-render

  const fetchCityTemperatures = async () => {
    setLoadingCities(true);
    // Keep existing error if it's critical (like Leaflet load failure)
    // setError(null); // Don't clear critical errors
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
      setError((prev) => prev || 'Failed to fetch city temperatures. Please try again later.'); // Prioritize existing error
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchUserLocationAndSensor = async () => {
    setLoadingLocation(true);
    setLoadingSensor(true);
    // Keep existing error if critical
    // setError(null);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location: Location = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation(location);
            setMapCenter([location.lat, location.lng]); // Update map center
            setMapZoom(10); // Zoom in closer to user location
            setLoadingLocation(false);

            try {
              // Fetch sensor data based on stored IP or fallback to mock
              const storedIp = localStorage.getItem('sensorIp');
              let sensorData: SensorData;
              if (storedIp) {
                  try {
                      const response = await fetch(`http://${storedIp}/data`);
                      if (!response.ok) throw new Error('Failed to fetch from sensor IP');
                      sensorData = await response.json();
                  } catch (ipErr) {
                      console.warn(`Failed fetching from ${storedIp}, using mock data.`, ipErr);
                      sensorData = await getSensorData(); // Fallback
                      setError((prev) => prev ? `${prev} Sensor connection failed.` : 'Sensor connection failed.');
                  }
              } else {
                  sensorData = await getSensorData(); // Use mock if no IP
              }
               // Basic validation
               const validatedData: SensorData = {
                 temperature: typeof sensorData.temperature === 'number' ? sensorData.temperature : null,
                 humidity: typeof sensorData.humidity === 'number' ? sensorData.humidity : null,
               };
              setUserSensorData(validatedData);

            } catch (sensorErr) {
              console.error('Error fetching user sensor data (after geo):', sensorErr);
              setError((prev) => prev ? `${prev} Failed to fetch your sensor data.` : 'Failed to fetch your sensor data.');
               try {
                 const mockSensorData = await getSensorData(); // Fallback to mock on error
                  setUserSensorData(mockSensorData);
               } catch (mockErr) { // Add curly braces here
                  console.error('Failed fetching mock sensor data:', mockErr);
                  setUserSensorData({ temperature: null, humidity: null });
               }
            } finally {
              setLoadingSensor(false);
            }
          },
          async (geoError) => {
            console.warn('Geolocation error:', geoError.message, 'Falling back to API.');
            await fetchLocationAndSensorFromAPI();
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        console.warn('Geolocation not supported, falling back to API.');
        await fetchLocationAndSensorFromAPI();
      }
    } catch (err) {
       console.error('General error fetching location/sensor:', err);
       setError((prev) => prev || 'Failed to determine your location or fetch sensor data.'); // Prioritize existing error
       setLoadingLocation(false);
       setLoadingSensor(false);
        // Attempt to load mock sensor data even if location fails
        try {
          const mockSensorData = await getSensorData();
          setUserSensorData(mockSensorData);
        } catch (mockErr) {
          console.error('Failed fetching mock sensor data after primary error:', mockErr);
          setUserSensorData({ temperature: null, humidity: null });
        }
    }
  };

  const fetchLocationAndSensorFromAPI = async () => {
    try {
      const location = await getCurrentLocation(); // API fallback for location
      setUserLocation(location);
      setMapCenter([location.lat, location.lng]); // Update map center from API
      setMapZoom(10); // Zoom in closer
    } catch (locError) {
        console.error('Error fetching location from API:', locError);
        setError((prev) => prev ? `${prev} Failed to retrieve location.` : 'Failed to retrieve location.');
    } finally {
        setLoadingLocation(false); // Location attempt (geo or API) finished
    }

     try {
       // Fetch sensor data based on stored IP or fallback to mock (independent of location fetch)
        const storedIp = localStorage.getItem('sensorIp');
        let sensorData: SensorData;
         if (storedIp) {
           try {
               const response = await fetch(`http://${storedIp}/data`);
               if (!response.ok) throw new Error('Failed to fetch from sensor IP');
               sensorData = await response.json();
           } catch (ipErr) {
               console.warn(`Failed fetching from ${storedIp}, using mock data.`, ipErr);
               sensorData = await getSensorData(); // Fallback
               setError((prev) => prev ? `${prev} Sensor connection failed.` : 'Sensor connection failed.');
           }
        } else {
           sensorData = await getSensorData(); // Use mock if no IP
        }

       // Basic validation
       const validatedData: SensorData = {
         temperature: typeof sensorData.temperature === 'number' ? sensorData.temperature : null,
         humidity: typeof sensorData.humidity === 'number' ? sensorData.humidity : null,
       };
        setUserSensorData(validatedData);
     } catch (sensorErr) {
       console.error('Error fetching sensor data (API fallback path):', sensorErr);
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
  };


  useEffect(() => {
    setIsClient(true); // Indicate we are now on the client

    // Dynamically import Leaflet and compatibility script only on the client-side
    Promise.all([
      import('leaflet'),
      import('leaflet-defaulticon-compatibility')
    ]).then(([leaflet, _]) => {
      L = leaflet;
      // Fix default icon path issue in Leaflet with bundlers (optional, handled by compatibility lib)
      // delete (L.Icon.Default.prototype as any)._getIconUrl;
      // L.Icon.Default.mergeOptions({
      //   iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
      //   iconUrl: require('leaflet/dist/images/marker-icon.png').default,
      //   shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
      // });
      setLeafletLoaded(true); // Mark Leaflet as loaded
      // Data fetching can now happen as Leaflet is available
      fetchCityTemperatures();
      fetchUserLocationAndSensor();
    }).catch(error => {
         console.error("Failed to load Leaflet or compatibility script:", error);
         setError("Map components could not be loaded."); // Set critical error
         setLoadingCities(false);
         setLoadingLocation(false);
         setLoadingSensor(false);
    });

    // Force re-render map on window resize or initial load - helps with tile issues
     const handleResize = () => setMapInstanceKey(prevKey => prevKey + 1);
     window.addEventListener('resize', handleResize);
     handleResize(); // Initial key set

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => window.removeEventListener('resize', handleResize); // Cleanup listener
  }, []); // Empty dependency array ensures this runs once on mount


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
      if (!L || !leafletLoaded) return {}; // Return empty if Leaflet not loaded
      return cityTemperatures.reduce((acc, city) => {
          const icon = createCustomIcon(city.temperature, 'accent', 30, 10);
          if (icon) {
            acc[city.city] = icon;
          }
          return acc;
      }, {} as Record<string, LeafletIconType>);
  }, [cityTemperatures, leafletLoaded]); // Add leafletLoaded dependency

  const userIcon = useMemo(() => {
      if (!userSensorData || userSensorData.temperature === null || !L || !leafletLoaded) return null; // Check for L and leafletLoaded
      return createCustomIcon(userSensorData.temperature, 'primary', 36, 12, 'primary-foreground');
  }, [userSensorData, leafletLoaded]); // Add leafletLoaded dependency

  const isLoading = loadingCities || loadingLocation || loadingSensor || !leafletLoaded; // Include leafletLoaded in loading state

  // Render nothing or a placeholder on the server
  if (!isClient) {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="lg:col-span-2 h-[564px]" /> {/* Approx Card height */}
                <Skeleton className="h-[250px]" /> {/* Approx Card height */}
            </div>
        </div>
    );
  }

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
              {/* MapContainer is always rendered, Skeleton overlays it when loading */}
              <MapContainer
                key={mapInstanceKey} // Use key to force re-render and avoid initialization error
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                className="w-full h-full rounded-b-lg z-0"
                style={{ backgroundColor: 'hsl(var(--muted))' }} // Match background
              >
                 {isLoading ? ( // Render Skeleton overlay if loading
                  <div className="absolute inset-0 bg-muted/80 flex items-center justify-center z-10">
                    <Skeleton className="w-3/4 h-3/4" />
                  </div>
                ) : ( // Render map layers only when not loading
                   <>
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
                       {userLocation && userSensorData && (!userIcon || userSensorData.temperature === null) && (
                           <Marker position={[userLocation.lat, userLocation.lng]}>
                              <Popup>
                                <div className="p-1">
                                  <h4 className="font-semibold text-sm mb-1">Your Location</h4>
                                  <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{userSensorData.temperature?.toFixed(1) ?? 'N/A'}°C</p>
                                </div>
                            </Popup>
                           </Marker>
                       )}
                   </>
                )}
              </MapContainer>
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


    