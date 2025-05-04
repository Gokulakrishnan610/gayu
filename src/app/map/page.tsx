
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet'; // Import Leaflet library
import type { LatLngExpression, Icon } from 'leaflet'; // Import Leaflet types
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
): Icon => {
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

  const fetchCityTemperatures = async () => {
    setLoadingCities(true);
    setError(null);
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
      setError('Failed to fetch city temperatures. Please try again later.');
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchUserLocationAndSensor = async () => {
    setLoadingLocation(true);
    setLoadingSensor(true);
    setError(null);
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
              const sensorData = await getSensorData();
              setUserSensorData(sensorData);
            } catch (sensorErr) {
              console.error('Error fetching user sensor data:', sensorErr);
              setError((prev) => prev ? `${prev} Failed to fetch your sensor data.` : 'Failed to fetch your sensor data.');
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
       setError('Failed to determine your location or fetch sensor data.');
       setLoadingLocation(false);
       setLoadingSensor(false);
    }
  };

  const fetchLocationAndSensorFromAPI = async () => {
    try {
      const [location, sensorData] = await Promise.all([
        getCurrentLocation(),
        getSensorData()
      ]);
      setUserLocation(location);
      setUserSensorData(sensorData);
      setMapCenter([location.lat, location.lng]); // Update map center from API
       setMapZoom(10); // Zoom in closer
    } catch (apiError) {
      console.error('Error fetching location/sensor from API:', apiError);
      setError('Could not retrieve location or sensor data from backup services.');
    } finally {
       setLoadingLocation(false);
       setLoadingSensor(false);
    }
  };

  useEffect(() => {
    fetchCityTemperatures();
    fetchUserLocationAndSensor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const temperatureDifference = useMemo(() => {
    if (!userLocation || !userSensorData || cityTemperatures.length === 0) return null;

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

    if (!nearestCity || !userSensorData) return null;

    const diff = userSensorData.temperature - nearestCity.temperature;
    return {
      city: nearestCity.name,
      difference: diff.toFixed(1),
      comparison: diff > 0 ? 'warmer' : diff < 0 ? 'cooler' : 'similar',
    };
  }, [userLocation, userSensorData, cityTemperatures]);

  // Memoize icons to prevent recreation on every render
  const cityIcons = useMemo(() => {
      return cityTemperatures.reduce((acc, city) => {
          acc[city.city] = createCustomIcon(city.temperature, 'accent', 30, 10);
          return acc;
      }, {} as Record<string, Icon>);
  }, [cityTemperatures]);

  const userIcon = useMemo(() => {
      if (!userSensorData) return null;
      return createCustomIcon(userSensorData.temperature, 'primary', 36, 12, 'primary-foreground');
  }, [userSensorData]);


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
          <CardContent className="h-[500px] p-0 relative"> {/* Added relative positioning */}
             {loadingLocation || loadingCities ? (
                <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg" /> // Use absolute positioning for Skeleton
              ) : (
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={true} // Enable scroll wheel zoom
                  className="w-full h-full rounded-b-lg z-0" // Ensure MapContainer has z-index 0
                  style={{ backgroundColor: 'hsl(var(--muted))' }} // Match background
                >
                 <MapUpdater center={mapCenter} zoom={mapZoom} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />

                  {/* City Markers */}
                  {cityTemperatures.map((city) => (
                    cityIcons[city.city] && ( // Ensure icon exists
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
                    )
                  ))}

                  {/* User Location Marker */}
                  {userLocation && userSensorData && userIcon && (
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
                </MapContainer>
              )}
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
                    Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
                  </span>
                </p>
                 <p className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5 text-accent" />
                  <span className="font-semibold">{userSensorData.temperature.toFixed(1)}°C</span>
                   <span className="text-sm text-muted-foreground">(Your Sensor)</span>
                </p>
                 <p className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                   {temperatureDifference ? (
                     <span className="text-sm">
                       {Math.abs(parseFloat(temperatureDifference.difference))}°C {temperatureDifference.comparison} than {temperatureDifference.city}.
                     </span>
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
