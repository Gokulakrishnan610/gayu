// 'use client';

// import React, { useEffect, useState, useMemo, useCallback } from 'react';
// import dynamic from 'next/dynamic';
// import { LatLngExpression, DivIcon } from 'leaflet';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Compass } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { getSensorData } from '@/services/sensor';

// // Dynamically load the map component (client-only)
// const DynamicMap = dynamic(() => import('./DynamicMap'), { ssr: false });

// const createCustomIcon = (label: string, bgColor = 'hsl(var(--primary))'): DivIcon | null => {
//   if (typeof window === 'undefined' || !(window as any).L) return null;
//   const L = (window as any).L;

//   return L.divIcon({
//     html: `<div style="background-color:${bgColor};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">${label}</div>`,
//     className: '',
//     iconSize: [36, 36],
//     iconAnchor: [18, 36],
//     popupAnchor: [0, -36]
//   });
// };

// const MapPage: React.FC = () => {
//   const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
//   const [userLocationError, setUserLocationError] = useState<string | null>(null);
//   const [sensorTemp, setSensorTemp] = useState<number | null>(null);

//   const getUserDeviceLocation = useCallback(() => {
//     if (!navigator.geolocation) {
//       setUserLocationError("Geolocation is not supported by your browser.");
//       return;
//     }

//     navigator.geolocation.getCurrentPosition(
//       position => {
//         setUserLocation([position.coords.latitude, position.coords.longitude]);
//         setUserLocationError(null);
//       },
//       error => setUserLocationError(error.message),
//       { enableHighAccuracy: true }
//     );
//   }, []);

//   useEffect(() => {
//     import('leaflet/dist/leaflet.css');
//     import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
//     import('leaflet-defaulticon-compatibility');
//     getUserDeviceLocation();
//   }, [getUserDeviceLocation]);

//   useEffect(() => {
//     const fetchSensor = async () => {
//       try {
//         const data = await getSensorData();
//         setSensorTemp(data.temperature);
//       } catch (err) {
//         console.error('Failed to fetch sensor data', err);
//       }
//     };
//     fetchSensor();
//   }, []);

//   const icon = useMemo(() => {
//     if (!userLocation) return null;
//     const label = sensorTemp !== null ? `${sensorTemp.toFixed(1)}°C` : '?';
//     return createCustomIcon(label);
//   }, [sensorTemp, userLocation]);

//   return (
//     <div className="container mx-auto p-4 space-y-6">
//       <h1 className="text-3xl font-bold text-primary">ESP32 Sensor Location</h1>

//       {userLocationError && (
//         <Alert variant="default" className="border-yellow-500 text-yellow-800">
//           <Compass className="h-4 w-4" />
//           <AlertTitle>Location Error</AlertTitle>
//           <AlertDescription className="flex justify-between items-center">
//             {userLocationError}
//             <Button size="sm" onClick={getUserDeviceLocation} className="ml-2">
//               Retry
//             </Button>
//           </AlertDescription>
//         </Alert>
//       )}

//       <Card>
//         <CardHeader>
//           <CardTitle>Sensor on Map</CardTitle>
//           <CardDescription>
//             Showing your current location with temperature from the ESP32 sensor.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="h-[500px] p-0">
//           {userLocation ? (
//             <DynamicMap location={userLocation} temperature={sensorTemp} icon={icon} />
//           ) : (
//             <Skeleton className="h-full w-full" />
//           )}
//         </CardContent>
//       </Card>
//     </div>
//  );
// };

// export default MapPage;


'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, DivIcon } from 'leaflet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, WifiOff, RefreshCw, ServerCog, Thermometer } from 'lucide-react'; // Added icons
import { Button } from '@/components/ui/button';
import { getSensorData as getMockSensorData, SensorData } from '@/services/sensor'; // Renamed import

// Dynamically load the map component (client-only)
const DynamicMap = dynamic(() => import('./DynamicMap'), { ssr: false });

// --- Leaflet and Icon Setup (Client-Side) ---
let L: typeof import('leaflet') | null = null;

const loadLeaflet = async () => {
    if (typeof window !== 'undefined') {
        if (!L) {
            L = await import('leaflet');
            await import('leaflet/dist/leaflet.css');
            await import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
            await import('leaflet-defaulticon-compatibility'); // Ensure JS runs

            // Fix default icon path issue if needed (adjust paths based on your build output)
            const LGlobal = L; // Alias to satisfy TypeScript
            if (LGlobal) {
                try {
                    delete (LGlobal.Icon.Default.prototype as any)._getIconUrl; // Needed for compatibility plugin
                    LGlobal.Icon.Default.mergeOptions({
                         iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
                         iconUrl: '/_next/static/media/marker-icon.png',
                         shadowUrl: '/_next/static/media/marker-shadow.png',
                    });
                } catch (e) {
                    console.error("Failed to load leaflet default icon assets, map markers might not appear correctly.", e);
                }
            }
        }
        return L;
    }
    return null;
};

const createCustomIcon = (
    label: string,
    colorType: 'primary' | 'accent' | 'destructive' = 'primary',
    size: number = 36,
    fontSize: number = 12
): DivIcon | null => {
    if (!L) return null; // Check if Leaflet is loaded

    let bgColor = 'hsl(var(--primary))';
    if (colorType === 'accent') bgColor = 'hsl(var(--accent))';
    if (colorType === 'destructive') bgColor = 'hsl(var(--destructive))';

    return L.divIcon({
        html: `<div style="background-color:${bgColor}; color:white; border-radius:50%; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; font-size:${fontSize}px; font-weight:bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.5);">${label}</div>`,
        className: '', // Important to clear default leaflet icon styles
        iconSize: [size, size],
        iconAnchor: [size / 2, size], // Anchor point at bottom center
        popupAnchor: [0, -size] // Popup anchor point above the icon
    });
};
// --- End Leaflet and Icon Setup ---


const MapPage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>({ temperature: null, humidity: null });
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [sensorIp, setSensorIp] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingSensor, setIsLoadingSensor] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);


  // --- Effects ---
  useEffect(() => {
    setIsClient(true);
    loadLeaflet().then(leafletInstance => {
        if (leafletInstance) {
            setLeafletLoaded(true);
            console.log("Leaflet loaded successfully for map page.");
        } else {
            console.error("Failed to load Leaflet for map page.");
             setUserLocationError("Map library failed to load.");
        }
    });
    const storedIp = localStorage.getItem('sensorIp');
    setSensorIp(storedIp);
  }, []); // Runs only once on mount

  const getUserDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUserLocationError("Geolocation is not supported by your browser.");
      setIsLoadingLocation(false);
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setUserLocationError(null);
        setIsLoadingLocation(false);
        console.log("User location obtained:", [position.coords.latitude, position.coords.longitude]);
      },
      error => {
        setUserLocationError(`Geolocation error: ${error.message}`);
        setIsLoadingLocation(false);
        console.error("Geolocation error:", error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

   const fetchSensor = useCallback(async () => {
        if (!isClient) return; // Don't run on server

        setIsLoadingSensor(true);
        setSensorError(null);
        setUsingMockData(false);
        let currentIp = localStorage.getItem('sensorIp'); // Get latest IP
        setSensorIp(currentIp); // Update state for display

        let data: SensorData;
        let errorMsg: string | null = null;
        let usedMock = false;

        if (currentIp) {
            try {
                const response = await fetch(`http://${currentIp}/data`);
                if (!response.ok) {
                    throw new Error(`Sensor responded with status ${response.status}`);
                }
                const jsonData = await response.json();
                data = {
                    temperature: typeof jsonData.temperature === 'number' ? jsonData.temperature : null,
                    humidity: typeof jsonData.humidity === 'number' ? jsonData.humidity : null,
                };
                console.log("Real sensor data fetched for map:", data);
            } catch (realError: any) {
                console.warn(`Failed to fetch from real sensor at ${currentIp}: ${realError.message}. Falling back to mock.`);
                errorMsg = `Sensor at ${currentIp} offline. Using mock data.`;
                data = await getMockSensorData(); // Use mock data
                usedMock = true;
            }
        } else {
            console.log("No sensor IP set, using mock data for map.");
            errorMsg = "No sensor IP configured. Using mock data.";
            data = await getMockSensorData(); // Use mock data
            usedMock = true;
        }

        setSensorData(data);
        setSensorError(errorMsg);
        setUsingMockData(usedMock);
        setIsLoadingSensor(false);
    }, [isClient]); // Depend on isClient

   // Fetch location and sensor data when client-side and leaflet ready
   useEffect(() => {
     if (isClient && leafletLoaded) {
       getUserDeviceLocation();
       fetchSensor(); // Initial sensor fetch
     }
   }, [isClient, leafletLoaded, getUserDeviceLocation, fetchSensor]);

   // Fetch sensor data periodically
    useEffect(() => {
       if (isClient) {
           const intervalId = setInterval(fetchSensor, 30000); // Fetch every 30 seconds
           return () => clearInterval(intervalId); // Cleanup interval
       }
   }, [isClient, fetchSensor]);


  // --- Memos ---
  const icon = useMemo(() => {
    if (!isClient || !leafletLoaded || !userLocation) return null;
    if (isLoadingSensor) return createCustomIcon('...', 'primary');
    if (sensorError && !sensorData.temperature) return createCustomIcon('!', 'destructive');
    const label = sensorData.temperature !== null ? `${sensorData.temperature.toFixed(0)}°` : '?';
    return createCustomIcon(label, 'primary');
  }, [isClient, leafletLoaded, userLocation, isLoadingSensor, sensorData.temperature, sensorError]);

  const isLoading = isLoadingLocation || isLoadingSensor || !isClient || !leafletLoaded;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
         <Compass className="w-7 h-7" /> Sensor Map
      </h1>

       {/* Combined Error/Info Alert */}
       {(userLocationError || sensorError) && (
         <Alert variant={userLocationError && !userLocationError.includes("Geolocation error") ? "destructive" : "default"} className="border-yellow-500 text-yellow-800 dark:border-yellow-400 dark:text-yellow-300">
           <WifiOff className="h-4 w-4" />
           <AlertTitle>Map & Sensor Status</AlertTitle>
           <AlertDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
             <span className="flex-grow">
               {userLocationError && `Location: ${userLocationError}. `}
               {sensorError && `Sensor: ${sensorError}`}
             </span>
             <div className="flex gap-2 mt-2 sm:mt-0 shrink-0">
               {!userLocationError?.includes("Geolocation is not supported") && (
                  <Button size="sm" variant="outline" onClick={getUserDeviceLocation} disabled={isLoadingLocation}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingLocation ? 'animate-spin' : ''}`} /> Retry Loc
                  </Button>
               )}
               <Button size="sm" variant="outline" onClick={fetchSensor} disabled={isLoadingSensor}>
                 <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingSensor ? 'animate-spin' : ''}`} /> Refresh Sensor
               </Button>
             </div>
           </AlertDescription>
         </Alert>
       )}

       {usingMockData && !sensorError?.includes("offline") && !isLoading && (
           <Alert variant="default" className="border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
              <ServerCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>Using Mock Sensor Data</AlertTitle>
              <AlertDescription>
                Displaying simulated sensor data. Go to <a href="/settings" className="underline font-medium">Settings</a> to configure your sensor IP.
              </AlertDescription>
           </Alert>
       )}


      <Card className="overflow-hidden shadow-lg">
        <CardHeader>
          <CardTitle>Sensor Location</CardTitle>
          <CardDescription>
             {isLoadingLocation && 'Getting your location... '}
             {isLoadingSensor && 'Fetching sensor data... '}
             {!isLoading && !isLoadingLocation && !userLocation && 'Could not get location. '}
             {!isLoading && userLocation && 'Showing sensor data at your approximate location.'}
             {sensorIp && ` (Sensor IP: ${sensorIp})`}
          </CardDescription>
        </CardHeader>
        {/* Ensure CardContent has a defined height for the map */}
        <CardContent className="h-[60vh] md:h-[70vh] p-0 relative bg-muted">
          {isLoading ? (
            <Skeleton className="absolute inset-0 h-full w-full z-10" />
          ) : userLocation ? (
            // Render DynamicMap only when location is available
             <DynamicMap
                location={userLocation}
                temperature={sensorData.temperature}
                icon={icon}
              />
          ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground">
               {userLocationError ? 'Could not load map due to location error.' : 'Waiting for location...'}
             </div>
          )}
           {/* Placeholder/Message when map cannot be shown */}
           {!isLoading && !userLocation && !userLocationError && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                   Getting location to display map...
                </div>
            )}
        </CardContent>
      </Card>
    </div>
 );
};

export default MapPage;
