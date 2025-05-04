// src/app/map/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Map, Marker, InfoWindow, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { MapSymbol } from '@vis.gl/react-google-maps'; // Import MapSymbol type
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, LocateFixed, MapPin, Thermometer } from 'lucide-react';
import { getCityTemperature, CityTemperature } from '@/services/city-temperature';
import { getCurrentLocation, Location } from '@/services/location';
import { getSensorData, SensorData } from '@/services/sensor'; // Import sensor data function

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

const MapPage: React.FC = () => {
  const [cityTemperatures, setCityTemperatures] = useState<CityData[]>([]);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [userSensorData, setUserSensorData] = useState<SensorData | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingSensor, setLoadingSensor] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 }); // Default center

  // Load the 'marker' library which includes SymbolPath
  const mapsLibrary = useMapsLibrary('marker');
  const [SymbolPath, setSymbolPath] = useState<typeof google.maps.SymbolPath | null>(null);

  useEffect(() => {
    if (mapsLibrary) {
      // Access SymbolPath once the library is loaded
      setSymbolPath(mapsLibrary.SymbolPath);
    }
  }, [mapsLibrary]);


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
      // Use browser geolocation first if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation(location);
            setMapCenter(location); // Center map on user location
            setLoadingLocation(false);

            // Now fetch sensor data
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
            // Fallback to API if geolocation fails or is denied
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

   // Helper function for API fallback
   const fetchLocationAndSensorFromAPI = async () => {
     try {
       const [location, sensorData] = await Promise.all([
         getCurrentLocation(), // Assumes this service exists and works
         getSensorData()
       ]);
       setUserLocation(location);
       setUserSensorData(sensorData);
       setMapCenter(location);
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
  }, []);

  const temperatureDifference = useMemo(() => {
    if (!userLocation || !userSensorData || cityTemperatures.length === 0) return null;

    // Find the nearest city (simple distance calculation, can be improved)
    let nearestCity: CityData | null = null;
    let minDistance = Infinity;

    cityTemperatures.forEach(city => {
      const distance = Math.sqrt(
        Math.pow(userLocation.lat - city.lat, 2) + Math.pow(userLocation.lng - city.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    if (!nearestCity) return null;

    const diff = userSensorData.temperature - nearestCity.temperature;
    return {
      city: nearestCity.name,
      difference: diff.toFixed(1),
      comparison: diff > 0 ? 'warmer' : diff < 0 ? 'cooler' : 'similar',
    };
  }, [userLocation, userSensorData, cityTemperatures]);

  const handleMarkerClick = (city: CityData) => {
      setSelectedCity(city);
   };

   const handleInfoWindowClose = () => {
      setSelectedCity(null);
   };

   // Define marker options using useMemo, dependent on SymbolPath being loaded
    const cityMarkerIcon = useMemo((): MapSymbol | null => {
        if (!SymbolPath) return null;
        return {
            path: SymbolPath.CIRCLE,
            fillColor: 'hsl(var(--accent))',
            fillOpacity: 0.8,
            strokeColor: 'hsl(var(--foreground))',
            strokeWeight: 1,
            scale: 8,
        };
    }, [SymbolPath]);

    const userMarkerIcon = useMemo((): MapSymbol | null => {
        if (!SymbolPath) return null;
        return {
            path: SymbolPath.CIRCLE,
            fillColor: 'hsl(var(--primary))',
            fillOpacity: 1,
            strokeColor: 'hsl(var(--primary-foreground))',
            strokeWeight: 2,
            scale: 10,
        };
    }, [SymbolPath]);


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
          <CardContent className="h-[500px] p-0">
             {/* Wait for maps library and location before rendering map */}
             {(loadingLocation || loadingCities || !mapsLibrary || !SymbolPath) && !userLocation ? (
               <Skeleton className="h-full w-full" />
             ) : (
               <Map
                 mapId={'ecosense-map'} // Optional: for custom styling
                 defaultCenter={mapCenter}
                 defaultZoom={3}
                 gestureHandling={'greedy'}
                 disableDefaultUI={true}
                 className="w-full h-full rounded-b-lg"
               >
                 {/* City Markers - Only render if icon is ready */}
                 {cityMarkerIcon && cityTemperatures.map((city) => (
                   <Marker
                     key={city.city}
                     position={{ lat: city.lat, lng: city.lng }}
                     title={`${city.city}: ${city.temperature}°C`}
                     onClick={() => handleMarkerClick(city)}
                     icon={cityMarkerIcon}
                     label={{
                        text: `${city.temperature.toFixed(0)}°`,
                        color: 'hsl(var(--accent-foreground))', // Ensure contrast
                        fontSize: '10px',
                        fontWeight: 'bold',
                      }}

                   />
                 ))}

                 {/* User Location Marker - Only render if icon is ready */}
                 {userLocation && userSensorData && userMarkerIcon && (
                     <Marker
                       position={userLocation}
                       title={`Your Location: ${userSensorData.temperature}°C`}
                       icon={userMarkerIcon}
                       label={{
                          text: `${userSensorData.temperature.toFixed(0)}°`,
                          color: 'hsl(var(--primary-foreground))',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                     />
                 )}
                  {/* Info Window for Selected City */}
                   {selectedCity && (
                     <InfoWindow
                       position={{ lat: selectedCity.lat, lng: selectedCity.lng }}
                       onCloseClick={handleInfoWindowClose}
                       // Options to prevent map panning when info window opens
                        // disableAutoPan={true}
                     >
                       <div className="p-1">
                         <h4 className="font-semibold text-sm mb-1">{selectedCity.city}</h4>
                         <p className="text-xs"><Thermometer className="inline h-3 w-3 mr-1" />{selectedCity.temperature.toFixed(1)}°C</p>
                       </div>
                     </InfoWindow>
                   )}

               </Map>
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
