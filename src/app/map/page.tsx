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





// 'use client';

// import { useEffect, useState } from 'react';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { AlertCircle, RefreshCw } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import DynamicMap from './DynamicMap';

// interface SensorData {
//   temperature: number | null;
//   humidity: number | null;
// }

// export default function MapPage() {
//   const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
//   const [sensorData, setSensorData] = useState<SensorData>({ temperature: null, humidity: null });
//   const [sensorError, setSensorError] = useState<string | null>(null);
//   const [isLoadingLocation, setIsLoadingLocation] = useState(true);
//   const [isLoadingSensor, setIsLoadingSensor] = useState(false);
//   const [usingMockData, setUsingMockData] = useState(false);

//   const fetchSensor = async () => {
//     setIsLoadingSensor(true);
//     try {
//       const res = await fetch('http://esp32.local/sensor');
//       if (!res.ok) throw new Error('ESP32 fetch failed');
//       const data = await res.json();
//       setSensorData({
//         temperature: data.temperature ?? null,
//         humidity: data.humidity ?? null,
//       });
//       setSensorError(null);
//       setUsingMockData(false);
//     } catch (err) {
//       console.error('Sensor fetch failed, using mock:', err);
//       setSensorData({
//         temperature: Math.floor(Math.random() * 10 + 20),
//         humidity: Math.floor(Math.random() * 30 + 40),
//       });
//       setSensorError('ESP32 sensor not reachable. Showing mock data.');
//       setUsingMockData(true);
//     } finally {
//       setIsLoadingSensor(false);
//     }
//   };

//   useEffect(() => {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
//         setUserLocation(coords);
//         setIsLoadingLocation(false);
//         fetchSensor();
//       },
//       (err) => {
//         console.error('Geolocation error:', err);
//         setSensorError('Unable to determine your location.');
//         setIsLoadingLocation(false);
//       }
//     );
//   }, []);

//   const handleRefresh = () => {
//     fetchSensor();
//   };

//   useEffect(() => {
//     const interval = setInterval(fetchSensor, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div className="p-4 max-w-3xl mx-auto space-y-4">
//       <Card>
//         <CardHeader className="flex flex-row justify-between items-center">
//           <div>
//             <CardTitle>Sensor Map</CardTitle>
//             <CardDescription className="text-xs sm:text-sm">
//               {isLoadingLocation && 'Getting your location... '}
//               {isLoadingSensor && 'Fetching sensor data... '}
//               {!isLoadingLocation && !userLocation && 'Could not get location. Map disabled.'}
//               {!isLoadingLocation && userLocation && usingMockData && 'Showing mock sensor data at your location.'}
//               {!isLoadingLocation && userLocation && !usingMockData && 'Showing live sensor data at your location.'}
//             </CardDescription>
//           </div>
//           <Button size="sm" onClick={handleRefresh} disabled={isLoadingLocation || isLoadingSensor}>
//             <RefreshCw className="w-4 h-4 mr-2" /> Refresh
//           </Button>
//         </CardHeader>
//         <CardContent>
//           {sensorError && (
//             <Alert variant="destructive" className="mb-4">
//               <AlertCircle className="h-4 w-4" />
//               <AlertTitle>Sensor Error</AlertTitle>
//               <AlertDescription>{sensorError}</AlertDescription>
//             </Alert>
//           )}

//           {userLocation ? (
//             <DynamicMap
//               location={userLocation}
//               temperature={sensorData.temperature}
//               humidity={sensorData.humidity}
//             />
//           ) : (
//             <p className="text-muted-foreground text-sm">Map not available without location access.</p>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }





// 'use client';

// import dynamic from 'next/dynamic';
// import { useState, useEffect } from 'react';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
// import { AlertTriangle } from 'lucide-react';
// import { SensorData, getSensorData as getMockSensorData } from '@/services/sensor';

// const DynamicMap = dynamic(() => import('./DynamicMap'), {
//   ssr: false,
//   loading: () => <Skeleton className="h-[500px] w-full" />,
// });

// export default function MapPage() {
//   const [sensorData, setSensorData] = useState<SensorData | null>(null);
//   const [sensorIp, setSensorIp] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [usingMock, setUsingMock] = useState(false);

//   useEffect(() => {
//     const fetchData = async () => {
//       const ip = localStorage.getItem('sensorIp');
//       setSensorIp(ip);

//       if (ip) {
//         try {
//           const res = await fetch(`http://${ip}/data`);
//           if (!res.ok) throw new Error(`Status ${res.status}`);
//           const data = await res.json();
//           setSensorData(data);
//           setUsingMock(false);
//           setError(null);
//         } catch (err: any) {
//           console.error('Sensor fetch failed, using mock:', err);
//           const mock = await getMockSensorData();
//           setSensorData(mock);
//           setUsingMock(true);
//           setError(`Failed to reach sensor at ${ip}. Showing mock data.`);
//         }
//       } else {
//         const mock = await getMockSensorData();
//         setSensorData(mock);
//         setUsingMock(true);
//         setError(`No sensor IP configured. Showing mock data.`);
//       }
//     };

//     fetchData();
//   }, []);

//   return (
//     <div className="container mx-auto px-4 py-6">
//       <h1 className="text-3xl font-bold mb-4">Sensor Map</h1>

//       {error && (
//         <Alert variant="destructive" className="mb-4">
//           <AlertTriangle className="w-4 h-4" />
//           <AlertTitle>Map Info</AlertTitle>
//           <AlertDescription>{error}</AlertDescription>
//         </Alert>
//       )}

//       {sensorData ? (
//         <DynamicMap
//           sensorData={sensorData}
//           lat={51.505}
//           lng={-0.09}
//           usingMock={usingMock}
//         />
//       ) : (
//         <Skeleton className="h-[500px] w-full" />
//       )}
//     </div>
//   );
// }










// 'use client';

// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import dynamic from 'next/dynamic';
// import type { LatLngExpression, DivIcon } from 'leaflet';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Compass, WifiOff, RefreshCw, ServerCog, Thermometer, Droplets } from 'lucide-react'; // Added Droplets
// import { Button } from '@/components/ui/button';
// import { getSensorData as getMockSensorData, SensorData } from '@/services/sensor';
// import { cn } from '@/lib/utils'; // Import the cn utility function


// // Dynamically load the map component (client-only)
// const DynamicMap = dynamic(() => import('./DynamicMap'), {
//   ssr: false,
//   loading: () => <Skeleton className="h-full w-full rounded-b-lg" />, // Use Skeleton during dynamic import load
// });

// // Helper function to check if running in browser
// const isBrowser = typeof window !== 'undefined';

// // --- Leaflet Icon Setup (Client-Side) ---
// const createCustomIcon = (
//   label: string | number | null,
//   bgColor = 'hsl(var(--primary))', // Default to primary theme color
//   size = 36,
//   fontSize = 12
// ): DivIcon | null => {
//   // Ensure L is loaded (dynamically imported below)
//   if (!isBrowser || !(window as any).L) return null;
//   const L = (window as any).L;

//   // Use '?' for null, format number, keep string as is
//   const displayLabel = label === null ? '?' : typeof label === 'number' ? label.toFixed(0) + '°' : label;

//   try {
//     return L.divIcon({
//       html: `<div style="background-color:${bgColor}; color:white; border-radius:50%; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; font-size:${fontSize}px; font-weight:bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.5);">${displayLabel}</div>`,
//       className: '', // No extra classes needed here
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size], // Anchor at bottom-center
//       popupAnchor: [0, -size] // Popup above the icon center
//     });
//   } catch (e) {
//     console.error("Error creating Leaflet DivIcon:", e);
//     return null;
//   }
// };
// // --- End Leaflet Icon Setup ---

// const MapPage: React.FC = () => {
//   const [isClient, setIsClient] = useState(false);
//   const [leafletLoaded, setLeafletLoaded] = useState(false);
//   const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
//   const [userLocationError, setUserLocationError] = useState<string | null>(null);
//   const [sensorData, setSensorData] = useState<SensorData>({ temperature: null, humidity: null });
//   const [sensorError, setSensorError] = useState<string | null>(null);
//   const [sensorIp, setSensorIp] = useState<string | null>(null);
//   const [isLoadingLocation, setIsLoadingLocation] = useState(true);
//   const [isLoadingSensor, setIsLoadingSensor] = useState(true);
//   const [usingMockData, setUsingMockData] = useState(false);

//   // --- Effects ---
//   useEffect(() => {
//     // This effect runs only once when the component mounts client-side
//     setIsClient(true);

//     // Asynchronously load Leaflet library and CSS
//     const loadLeaflet = async () => {
//       if (isBrowser) { // Double-check running in browser
//         try {
//             // Dynamically import CSS first
//             await import('leaflet/dist/leaflet.css');
//             await import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
//             // Dynamically import Leaflet JS libraries
//             const L = await import('leaflet');
//             await import('leaflet-defaulticon-compatibility');

//             // Fix default icon path issue - crucial for markers to appear correctly
//             delete (L.Icon.Default.prototype as any)._getIconUrl;
//             L.Icon.Default.mergeOptions({
//                  // Paths relative to the public directory, copied via webpack in next.config.ts
//                  iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
//                  iconUrl: '/_next/static/media/marker-icon.png',
//                  shadowUrl: '/_next/static/media/marker-shadow.png',
//             });

//             (window as any).L = L; // Make L globally available if needed (e.g., for createCustomIcon)
//             setLeafletLoaded(true); // Mark Leaflet as loaded
//             // console.log("Leaflet loaded successfully.");
//         } catch (e) {
//              console.error("Failed to load Leaflet dependencies", e);
//              setUserLocationError("Map library failed to load. Please refresh."); // Inform user
//              setIsLoadingLocation(false); // Stop location loading if map lib fails
//         }
//       }
//     };
//     loadLeaflet();

//     // Load sensor IP from localStorage
//     const storedIp = localStorage.getItem('sensorIp');
//     setSensorIp(storedIp);
//   }, []); // Empty dependency array ensures this runs only once on mount


//   // Function to get user's geographical location
//   const getUserDeviceLocation = useCallback(() => {
//     // Guard clauses: Ensure running on client and Leaflet is ready
//     if (!isClient || !leafletLoaded) return;

//     // Check if Geolocation API is available
//     if (!navigator.geolocation) {
//       setUserLocationError("Geolocation is not supported by your browser.");
//       setIsLoadingLocation(false);
//       return;
//     }

//     // Start loading and clear previous errors
//     setIsLoadingLocation(true);
//     setUserLocationError(null);

//     // Request current position
//     navigator.geolocation.getCurrentPosition(
//       position => {
//         // Success: Update location state
//         setUserLocation([position.coords.latitude, position.coords.longitude]);
//         setIsLoadingLocation(false);
//         // console.log("User location obtained:", [position.coords.latitude, position.coords.longitude]);
//       },
//       error => {
//         // Error handling: Provide user-friendly messages
//         let message = `Geolocation error: ${error.message}`;
//         if (error.code === error.PERMISSION_DENIED) {
//           message = "Geolocation permission denied. Please enable location access in your browser settings.";
//         } else if (error.code === error.POSITION_UNAVAILABLE) {
//           message = "Location information is unavailable at the moment.";
//         } else if (error.code === error.TIMEOUT) {
//           message = "Getting your location timed out. Please try again.";
//         }
//         setUserLocationError(message);
//         setIsLoadingLocation(false);
//         console.error("Geolocation error:", error.code, error.message);
//       },
//       // Geolocation options
//       { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
//     );
//   }, [isClient, leafletLoaded]); // Dependencies: Only re-create function if these change


//   // Function to fetch sensor data (real or mock)
//   const fetchSensor = useCallback(async () => {
//     if (!isClient) return; // Don't run on server

//     setIsLoadingSensor(true);
//     let currentIp = localStorage.getItem('sensorIp'); // Get latest IP from storage
//     setSensorIp(currentIp); // Update state for display

//     let data: SensorData;
//     let errorMsg: string | null = null;
//     let usedMock = false;

//     if (currentIp) {
//       // Attempt to fetch from the real sensor IP
//       try {
//         // console.log(`Attempting to fetch from real sensor at ${currentIp}...`);
//         const response = await fetch(`http://${currentIp}/data`);
//         if (!response.ok) {
//           throw new Error(`Sensor responded with status ${response.status}`);
//         }
//         const jsonData = await response.json();
//         // Validate received data structure
//         if (typeof jsonData !== 'object' || jsonData === null || typeof jsonData.temperature !== 'number' || typeof jsonData.humidity !== 'number') {
//            throw new Error('Invalid data format received from sensor');
//         }
//         data = { temperature: jsonData.temperature, humidity: jsonData.humidity };
//         // console.log("Real sensor data fetched:", data);
//         setSensorError(null); // Clear previous sensor errors on success
//       } catch (realError: any) {
//         // Fallback to mock data on error
//         console.warn(`Failed to fetch from real sensor at ${currentIp}: ${realError.message}. Falling back to mock data.`);
//         errorMsg = `Sensor at ${currentIp} is offline or unreachable. Using simulated data.`;
//         data = await getMockSensorData(); // Fetch mock data
//         usedMock = true;
//         setSensorError(errorMsg); // Set the error message for UI feedback
//       }
//     } else {
//       // Use mock data if no IP is set in localStorage
//       // console.log("No sensor IP configured, using mock data.");
//       errorMsg = "No sensor IP configured. Using simulated data.";
//       data = await getMockSensorData();
//       usedMock = true;
//       setSensorError(errorMsg);
//     }

//     // Update state with fetched data (real or mock)
//     setSensorData(data);
//     setUsingMockData(usedMock); // Track if mock data is being used
//     setIsLoadingSensor(false); // Mark sensor loading as complete
//   }, [isClient]); // Dependency: Re-create function only if isClient changes


//   // Fetch initial location and sensor data when the component is ready
//   useEffect(() => {
//     if (isClient && leafletLoaded) {
//       getUserDeviceLocation();
//       fetchSensor(); // Fetch sensor data immediately
//     }
//   }, [isClient, leafletLoaded, getUserDeviceLocation, fetchSensor]); // Run when client-side, Leaflet loaded, or fetch functions change


//   // Set up interval to periodically fetch sensor data
//   useEffect(() => {
//     if (isClient && leafletLoaded) {
//       const intervalId = setInterval(fetchSensor, 30000); // Fetch every 30 seconds
//       // console.log("Sensor data fetch interval started.");

//       // Cleanup function: Clear interval when component unmounts or dependencies change
//       return () => {
//         clearInterval(intervalId);
//         // console.log("Sensor data fetch interval stopped.");
//       };
//     }
//   }, [isClient, leafletLoaded, fetchSensor]); // Dependencies ensure interval restarts if needed


//   // --- Memos ---
//   // Memoize the sensor marker icon creation to avoid redundant calculations
//   const sensorMarkerIcon = useMemo(() => {
//     // Prerequisites for creating an icon
//     if (!isClient || !leafletLoaded || !userLocation) return null;

//     // Display different icons based on loading/error/data state
//     if (isLoadingSensor || isLoadingLocation) {
//         return createCustomIcon('...', 'hsl(var(--muted-foreground))'); // Loading state icon (grey)
//     }

//     if (sensorError && !usingMockData) { // Real sensor connection error
//         return createCustomIcon('!', 'hsl(var(--destructive))'); // Error state icon (red)
//     }

//     // Valid data (real or mock)
//     const color = usingMockData ? 'hsl(var(--accent))' : 'hsl(var(--primary))'; // Amber for mock, Teal for real
//     return createCustomIcon(sensorData.temperature, color); // Pass temperature for label

//   }, [
//     isClient,
//     leafletLoaded,
//     isLoadingSensor,
//     isLoadingLocation,
//     userLocation, // Depends on user location being available
//     sensorData.temperature, // Depends on the temperature value
//     sensorError, // Depends on error state
//     usingMockData, // Depends on whether mock data is used
//   ]);

//   // Determine overall loading state
//   const isLoading = isLoadingLocation || isLoadingSensor;
//   // Determine if the map should be displayed
//   const showMap = isClient && leafletLoaded && userLocation;

//   // --- Render ---
//   return (
//     <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-h-[calc(100vh-var(--header-height,100px))]"> {/* Adjust min-height based on header */}
//       <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2 mb-4">
//         <Compass className="w-6 h-6 sm:w-7 sm:h-7" /> Sensor Map
//       </h1>

//       {/* Combined Alert for Location and Sensor Status */}
//       {(userLocationError || sensorError) && (
//         <Alert
//            // Dynamically set variant based on error type
//            variant={userLocationError && !userLocationError.includes("Geolocation permission") ? "destructive" : (sensorError && !usingMockData ? "destructive" : "default")}
//            // Apply conditional styling for different alert types
//            className={cn(
//              'mb-6 transition-colors duration-300', // Base styling
//              (sensorError && usingMockData) && 'border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300', // Mock data info (blue)
//              (userLocationError && userLocationError.includes("Geolocation permission")) && 'border-yellow-500 text-yellow-800 dark:border-yellow-400 dark:text-yellow-300', // Location permission warning (yellow)
//              (sensorError && !usingMockData) && 'border-destructive text-destructive', // Real sensor error (red)
//              (userLocationError && !userLocationError.includes("Geolocation permission") && !userLocationError.includes("supported")) && 'border-destructive text-destructive' // Other location errors (red)
//            )}
//         >
//             {/* Choose icon based on error type */}
//             {sensorError && !usingMockData ? <WifiOff className="h-4 w-4 text-destructive" /> : (userLocationError ? <Compass className="h-4 w-4"/> : <ServerCog className="h-4 w-4" />)}
//           <AlertTitle>Map & Sensor Status</AlertTitle>
//           <AlertDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
//             <span className="flex-grow text-sm">
//               {/* Display relevant error messages */}
//               {userLocationError && `Location: ${userLocationError}. `}
//               {sensorError && `Sensor: ${sensorError}`}
//             </span>
//             <div className="flex gap-2 mt-2 sm:mt-0 shrink-0">
//                {/* Show location retry button only if applicable */}
//                {userLocationError && !userLocationError.includes("supported") && (
//                  <Button size="sm" variant="outline" onClick={getUserDeviceLocation} disabled={isLoadingLocation}>
//                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingLocation ? 'animate-spin' : ''}`} /> Retry Loc
//                  </Button>
//               )}
//               {/* Always show sensor refresh button */}
//               <Button size="sm" variant="outline" onClick={fetchSensor} disabled={isLoadingSensor}>
//                 <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingSensor ? 'animate-spin' : ''}`} /> Refresh Sensor
//               </Button>
//             </div>
//           </AlertDescription>
//         </Alert>
//       )}

//       {/* Map Card */}
//       <Card className="overflow-hidden shadow-lg flex-grow flex flex-col">
//         <CardHeader className="shrink-0 border-b bg-card md:bg-transparent"> {/* Add border to header, background for mobile */}
//           <CardTitle className="text-lg sm:text-xl">Sensor Location</CardTitle>
//           <CardDescription className="text-xs sm:text-sm pt-1">
//             {/* Display status message */}
//             {isLoading && 'Loading location and sensor data... '}
//             {!isLoading && !userLocation && 'Could not determine your location. Map functionality disabled. '}
//             {!isLoading && userLocation && 'Showing sensor data near your current location.'}
//             {sensorIp && ` (Sensor IP: ${sensorIp})`}
//             {!sensorIp && !isLoading && ' (No sensor IP configured - using simulated data)'}
//           </CardDescription>
//         </CardHeader>
//          {/* Use h-[calc(100%-X)] where X is approx header height or set fixed height like h-[500px] or h-[60vh] */}
//         <CardContent className="flex-grow p-0 relative bg-muted h-[500px] md:h-auto"> {/* Fixed height for consistency, md:h-auto for larger */}
//            {/* Container for the map or skeleton */}
//            <div className="absolute inset-0 w-full h-full">
//                {isLoading ? (
//                   <Skeleton className="h-full w-full rounded-b-lg" />
//                ) : showMap && DynamicMap ? (
//                    <DynamicMap
//                        // No key needed here, let DynamicMap manage its own instance
//                        location={userLocation} // Pass validated user location
//                        temperature={sensorData.temperature}
//                        humidity={sensorData.humidity}
//                        icon={sensorMarkerIcon} // Pass memoized icon
//                    />
//                ) : (
//                     // Show a message if map cannot be displayed (e.g., location error and no skeleton)
//                     <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground rounded-b-lg">
//                       <p>Map cannot be displayed.</p>
//                     </div>
//                )}
//             </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default MapPage;





'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, DivIcon } from 'leaflet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, WifiOff, RefreshCw, ServerCog, Thermometer, Droplets } from 'lucide-react'; // Added Droplets
import { Button } from '@/components/ui/button';
import { getSensorData as getMockSensorData, SensorData } from '@/services/sensor';
import { cn } from '@/lib/utils'; // Import the cn utility function


// Dynamically load the map component (client-only)
// Make sure DynamicMap is only rendered client-side
const DynamicMap = dynamic(() => import('./DynamicMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-b-lg" />, // Use Skeleton during dynamic import load
});

// Helper function to check if running in browser
const isBrowser = typeof window !== 'undefined';

// --- Leaflet Icon Setup (Client-Side) ---
const createCustomIcon = (
  label: string | number | null,
  bgColor = 'hsl(var(--primary))', // Default to primary theme color
  size = 36,
  fontSize = 12
): DivIcon | null => {
  // Ensure L is loaded (dynamically imported below)
  if (!isBrowser || !(window as any).L) return null;
  const L = (window as any).L;

  // Use '?' for null, format number, keep string as is
  const displayLabel = label === null ? '?' : typeof label === 'number' ? label.toFixed(0) + '°' : label;

  try {
    return L.divIcon({
      html: `<div style="background-color:${bgColor}; color:white; border-radius:50%; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; font-size:${fontSize}px; font-weight:bold; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.5);">${displayLabel}</div>`,
      className: '', // No extra classes needed here
      iconSize: [size, size],
      iconAnchor: [size / 2, size], // Anchor at bottom-center
      popupAnchor: [0, -size] // Popup above the icon center
    });
  } catch (e) {
    console.error("Error creating Leaflet DivIcon:", e);
    return null;
  }
};
// --- End Leaflet Icon Setup ---

const MapPage: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  // Initialize userLocation state with more specific type or null
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>({ temperature: null, humidity: null });
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [sensorIp, setSensorIp] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingSensor, setIsLoadingSensor] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);

  // --- Effects ---
  useEffect(() => {
    // This effect runs only once when the component mounts client-side
    setIsClient(true);

    // Asynchronously load Leaflet library and CSS only on the client
    const loadLeaflet = async () => {
      if (isBrowser) { // Double-check running in browser
        try {
            // Dynamically import CSS first
            await import('leaflet/dist/leaflet.css');
            await import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
            // Dynamically import Leaflet JS libraries
            const L = await import('leaflet');
            await import('leaflet-defaulticon-compatibility');

            // Fix default icon path issue - crucial for markers to appear correctly
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                 // Paths relative to the public directory, potentially adjusted by webpack config
                 iconRetinaUrl: '/_next/static/media/marker-icon-2x.png',
                 iconUrl: '/_next/static/media/marker-icon.png',
                 shadowUrl: '/_next/static/media/marker-shadow.png',
            });

            (window as any).L = L; // Make L globally available if needed (e.g., for createCustomIcon)
            setLeafletLoaded(true); // Mark Leaflet as loaded
            // console.log("Leaflet loaded successfully.");
        } catch (e) {
             console.error("Failed to load Leaflet dependencies", e);
             setUserLocationError("Map library failed to load. Please refresh."); // Inform user
             setIsLoadingLocation(false); // Stop location loading if map lib fails
        }
      }
    };
    loadLeaflet();

    // Load sensor IP from localStorage
    const storedIp = localStorage.getItem('sensorIp');
    setSensorIp(storedIp);
  }, []); // Empty dependency array ensures this runs only once on mount


  // Function to get user's geographical location
  const getUserDeviceLocation = useCallback(() => {
    // Guard clauses: Ensure running on client and Leaflet is ready
    if (!isClient || !leafletLoaded) return;

    // Check if Geolocation API is available
    if (!navigator.geolocation) {
      setUserLocationError("Geolocation is not supported by your browser.");
      setIsLoadingLocation(false);
      return;
    }

    // Start loading and clear previous errors
    setIsLoadingLocation(true);
    setUserLocationError(null);

    // Request current position
    navigator.geolocation.getCurrentPosition(
      position => {
        // Success: Update location state
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(newLocation);
        setIsLoadingLocation(false);
        // console.log("User location obtained:", newLocation);
      },
      error => {
        // Error handling: Provide user-friendly messages
        let message = `Geolocation error: ${error.message}`;
        if (error.code === error.PERMISSION_DENIED) {
          message = "Geolocation permission denied. Please enable location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable at the moment.";
        } else if (error.code === error.TIMEOUT) {
          message = "Getting your location timed out. Please try again.";
        }
        setUserLocationError(message);
        setUserLocation(null); // Reset location on error
        setIsLoadingLocation(false);
        console.error("Geolocation error:", error.code, error.message);
      },
      // Geolocation options
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [isClient, leafletLoaded]); // Dependencies: Only re-create function if these change


  // Function to fetch sensor data (real or mock)
  const fetchSensor = useCallback(async () => {
    if (!isClient) return; // Don't run on server

    setIsLoadingSensor(true);
    let currentIp = localStorage.getItem('sensorIp'); // Get latest IP from storage
    setSensorIp(currentIp); // Update state for display

    let data: SensorData;
    let errorMsg: string | null = null;
    let usedMock = false;

    if (currentIp) {
      // Attempt to fetch from the real sensor IP
      try {
        // console.log(`Attempting to fetch from real sensor at ${currentIp}...`);
        const response = await fetch(`https://${currentIp}/api/data`);
        if (!response.ok) {
          throw new Error(`Sensor responded with status ${response.status}`);
        }
        const jsonData = await response.json();
        // Validate received data structure
        if (typeof jsonData !== 'object' || jsonData === null || typeof jsonData.temperature !== 'number' || typeof jsonData.humidity !== 'number') {
           throw new Error('Invalid data format received from sensor');
        }
        data = { temperature: jsonData.temperature, humidity: jsonData.humidity };
        // console.log("Real sensor data fetched:", data);
        setSensorError(null); // Clear previous sensor errors on success
      } catch (realError: any) {
        // Fallback to mock data on error
        console.warn(`Failed to fetch from real sensor at ${currentIp}: ${realError.message}. Falling back to mock data.`);
        errorMsg = `Sensor at ${currentIp} is offline or unreachable. Using simulated data.`;
        data = await getMockSensorData(); // Fetch mock data
        usedMock = true;
        setSensorError(errorMsg); // Set the error message for UI feedback
      }
    } else {
      // Use mock data if no IP is set in localStorage
      // console.log("No sensor IP configured, using mock data.");
      errorMsg = "No sensor IP configured. Using simulated data.";
      data = await getMockSensorData();
      usedMock = true;
      setSensorError(errorMsg);
    }

    // Update state with fetched data (real or mock)
    setSensorData(data);
    setUsingMockData(usedMock); // Track if mock data is being used
    setIsLoadingSensor(false); // Mark sensor loading as complete
  }, [isClient]); // Dependency: Re-create function only if isClient changes


  // Fetch initial location and sensor data when the component is ready
  useEffect(() => {
    if (isClient && leafletLoaded) {
      getUserDeviceLocation();
      fetchSensor(); // Fetch sensor data immediately
    }
  }, [isClient, leafletLoaded, getUserDeviceLocation, fetchSensor]); // Run when client-side, Leaflet loaded, or fetch functions change


  // Set up interval to periodically fetch sensor data
  useEffect(() => {
    if (isClient && leafletLoaded) {
      const intervalId = setInterval(fetchSensor, 30000); // Fetch every 30 seconds
      // console.log("Sensor data fetch interval started.");

      // Cleanup function: Clear interval when component unmounts or dependencies change
      return () => {
        clearInterval(intervalId);
        // console.log("Sensor data fetch interval stopped.");
      };
    }
  }, [isClient, leafletLoaded, fetchSensor]); // Dependencies ensure interval restarts if needed


  // Determine overall loading state
  const isLoading = isLoadingLocation || isLoadingSensor;
  // Determine if the map should be displayed (requires location)
  const showMap = isClient && leafletLoaded && userLocation !== null;

  // --- Render ---
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-h-[calc(100vh-var(--header-height,80px))]"> {/* Adjust min-height based on header */}
      <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2 mb-4">
        <Compass className="w-6 h-6 sm:w-7 sm:h-7" /> Sensor Map
      </h1>

      {/* Combined Alert for Location and Sensor Status */}
      {(userLocationError || sensorError) && (
        <Alert
           // Dynamically set variant based on error type
           variant={userLocationError && !userLocationError.includes("Geolocation permission") ? "destructive" : (sensorError && !usingMockData ? "destructive" : "default")}
           // Apply conditional styling for different alert types
           className={cn(
             'mb-6 transition-colors duration-300', // Base styling
             (sensorError && usingMockData) && 'border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300', // Mock data info (blue)
             (userLocationError && userLocationError.includes("Geolocation permission")) && 'border-yellow-500 text-yellow-800 dark:border-yellow-400 dark:text-yellow-300', // Location permission warning (yellow)
             (sensorError && !usingMockData) && 'border-destructive text-destructive', // Real sensor error (red)
             (userLocationError && !userLocationError.includes("Geolocation permission") && !userLocationError.includes("supported")) && 'border-destructive text-destructive' // Other location errors (red)
           )}
        >
            {/* Choose icon based on error type */}
            {sensorError && !usingMockData ? <WifiOff className="h-4 w-4 text-destructive" /> : (userLocationError ? <Compass className="h-4 w-4"/> : <ServerCog className="h-4 w-4" />)}
          <AlertTitle>Map & Sensor Status</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <span className="flex-grow text-sm">
              {/* Display relevant error messages */}
              {userLocationError && `Location: ${userLocationError}. `}
              {sensorError && `Sensor: ${sensorError}`}
            </span>
            <div className="flex gap-2 mt-2 sm:mt-0 shrink-0">
               {/* Show location retry button only if applicable */}
               {userLocationError && !userLocationError.includes("supported") && (
                 <Button size="sm" variant="outline" onClick={getUserDeviceLocation} disabled={isLoadingLocation}>
                   <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingLocation ? 'animate-spin' : ''}`} /> Retry Loc
                 </Button>
              )}
              {/* Always show sensor refresh button */}
              <Button size="sm" variant="outline" onClick={fetchSensor} disabled={isLoadingSensor}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingSensor ? 'animate-spin' : ''}`} /> Refresh Sensor
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Map Card */}
      <Card className="overflow-hidden shadow-lg flex-grow flex flex-col">
        <CardHeader className="shrink-0 border-b bg-card md:bg-transparent"> {/* Add border to header, background for mobile */}
          <CardTitle className="text-lg sm:text-xl">Sensor Location</CardTitle>
          <CardDescription className="text-xs sm:text-sm pt-1">
            {/* Display status message */}
            {isLoadingLocation && 'Acquiring your location... '}
            {!isLoadingLocation && userLocation && 'Showing sensor data near your current location. '}
            {!isLoadingLocation && !userLocation && userLocationError && 'Map disabled. Could not determine your location. '}
            {!isLoadingLocation && !userLocation && !userLocationError && 'Map disabled. Location not available. '}
            {isLoadingSensor && !isLoadingLocation && 'Fetching sensor data... '}
            {sensorIp && `(Sensor IP: ${sensorIp})`}
            {!sensorIp && !isLoadingSensor && ' (No sensor IP configured - using simulated data)'}
          </CardDescription>
        </CardHeader>
         {/* Use h-[calc(100%-X)] where X is approx header height or set fixed height like h-[500px] or h-[60vh] */}
        <CardContent className="flex-grow p-0 relative bg-muted h-[500px] md:h-auto"> {/* Fixed height for consistency, md:h-auto for larger */}
           {/* Container for the map or skeleton/message */}
           <div className="absolute inset-0 w-full h-full">
               {isLoadingLocation ? (
                  <Skeleton className="h-full w-full rounded-b-lg" />
               ) : showMap && DynamicMap ? (
                   <DynamicMap
                       // Pass validated user location directly
                       lat={userLocation.lat}
                       lng={userLocation.lng}
                       sensorData={sensorData}
                       usingMock={usingMockData}
                   />
               ) : (
                    // Show a message if map cannot be displayed (e.g., location error and no skeleton)
                    <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground rounded-b-lg">
                      <p>
                         {userLocationError ? "Map cannot be displayed due to location error." : "Waiting for location data..."}
                      </p>
                    </div>
               )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapPage;

    
