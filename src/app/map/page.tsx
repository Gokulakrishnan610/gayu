'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { LatLngExpression, Map as LeafletMap, DivIcon } from 'leaflet';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSensorData } from '@/services/sensor'; // Replace with your actual fetch logic

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false, loading: () => <Skeleton className="h-full w-full" /> });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

const createCustomIcon = (label: string, bgColor: string = 'hsl(var(--primary))'): DivIcon | null => {
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

const MapController = ({ setMapInstance, center }: { setMapInstance: (map: LeafletMap) => void; center: LatLngExpression }) => {
    const map = useMap();
    useEffect(() => {
        if (map) {
            setMapInstance(map);
            map.setView(center, 13);
        }
    }, [map, setMapInstance, center]);
    return null;
};

const MapPage: React.FC = () => {
    const [userLocation, setUserLocation] = useState<LatLngExpression | null>(null);
    const [userLocationError, setUserLocationError] = useState<string | null>(null);
    const [sensorTemp, setSensorTemp] = useState<number | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);

    const getUserDeviceLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setUserLocationError("Geolocation is not supported by your browser.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
            err => setUserLocationError(err.message),
            { enableHighAccuracy: true }
        );
    }, []);

    useEffect(() => {
        // Load Leaflet styles
        import('leaflet/dist/leaflet.css');
        import('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css');
        import('leaflet-defaulticon-compatibility');
        getUserDeviceLocation();
    }, [getUserDeviceLocation]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getSensorData();
                setSensorTemp(data.temperature);
            } catch (err) {
                console.error("Sensor fetch error", err);
            }
        };
        fetchData();
    }, []);

    const setMapInstance = useCallback((map: LeafletMap) => {
        mapRef.current = map;
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
                    {userLocation && (
                        <MapContainer center={userLocation} zoom={13} className="h-full w-full">
                            <MapController center={userLocation} setMapInstance={setMapInstance} />
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {icon && (
                                <Marker position={userLocation} icon={icon}>
                                    <Popup>
                                        <strong>Sensor Location</strong><br />
                                        Temp: {sensorTemp !== null ? `${sensorTemp.toFixed(1)}°C` : 'Loading...'}
                                    </Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MapPage;
