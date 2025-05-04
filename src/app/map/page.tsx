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





'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { SensorData, getSensorData as getMockSensorData } from '@/services/sensor';

const DynamicMap = dynamic(() => import('./DynamicMap'), {
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full" />,
});

export default function MapPage() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [sensorIp, setSensorIp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const ip = localStorage.getItem('sensorIp');
      setSensorIp(ip);

      if (ip) {
        try {
          const res = await fetch(`http://${ip}/data`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const data = await res.json();
          setSensorData(data);
          setUsingMock(false);
          setError(null);
        } catch (err: any) {
          console.error('Sensor fetch failed, using mock:', err);
          const mock = await getMockSensorData();
          setSensorData(mock);
          setUsingMock(true);
          setError(`Failed to reach sensor at ${ip}. Showing mock data.`);
        }
      } else {
        const mock = await getMockSensorData();
        setSensorData(mock);
        setUsingMock(true);
        setError(`No sensor IP configured. Showing mock data.`);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-4">Sensor Map</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Map Info</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sensorData ? (
        <DynamicMap
          sensorData={sensorData}
          lat={51.505}
          lng={-0.09}
          usingMock={usingMock}
        />
      ) : (
        <Skeleton className="h-[500px] w-full" />
      )}
    </div>
  );
}
