'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LatLngExpression, DivIcon } from 'leaflet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSensorData } from '@/services/sensor';

// Dynamically load the map component (client-only)
const DynamicMap = dynamic(() => import('./DynamicMap'), { ssr: false });

const createCustomIcon = (label: string, bgColor = 'hsl(var(--primary))'): DivIcon | null => {
  if (typeof window === 'undefined' || !(window as any).L) return null;
  const L = (window as any).L;

  return L.divIcon({
    html: `<div style="background-color:${bgColor};color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">${label}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const MapPage: React.FC = () => {
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
  const [userLocationError, setUserLocationError] = useState<string | null>(null);
  const [sensorTemp, setSensorTemp] = useState<number | null>(null);

  const getUserDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUserLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setUserLocationError(null);
      },
      error => setUserLocationError(error.message),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    import('leaflet/dist/leaflet.css');
    import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
    import('leaflet-defaulticon-compatibility');
    getUserDeviceLocation();
  }, [getUserDeviceLocation]);

  useEffect(() => {
    const fetchSensor = async () => {
      try {
        const data = await getSensorData();
        setSensorTemp(data.temperature);
      } catch (err) {
        console.error('Failed to fetch sensor data', err);
      }
    };
    fetchSensor();
  }, []);

  const icon = useMemo(() => {
    if (!userLocation) return null;
    const label = sensorTemp !== null ? `${sensorTemp.toFixed(1)}°C` : '?';
    return createCustomIcon(label);
  }, [sensorTemp, userLocation]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-primary">ESP32 Sensor Location</h1>

      {userLocationError && (
        <Alert variant="default" className="border-yellow-500 text-yellow-800">
          <Compass className="h-4 w-4" />
          <AlertTitle>Location Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            {userLocationError}
            <Button size="sm" onClick={getUserDeviceLocation} className="ml-2">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sensor on Map</CardTitle>
          <CardDescription>
            Showing your current location with temperature from the ESP32 sensor.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] p-0">
          {userLocation ? (
            <DynamicMap location={userLocation} temperature={sensorTemp} icon={icon} />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </CardContent>
      </Card>
    </div>
 );
};

export default MapPage;