// 'use client';

// import React from 'react';
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import { LatLngExpression, DivIcon } from 'leaflet';

// type Props = {
//   location: LatLngExpression;
//   temperature: number | null;
//   icon: DivIcon | null;
// };

// const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// const DynamicMap: React.FC<Props> = ({ location, temperature, icon }) => {
//   const mapKey = Array.isArray(location) ? location.join(',') : String(location);

//   return (
//     <MapContainer
//       key={mapKey}
//       center={location}
//       zoom={13}
//       scrollWheelZoom={true}
//       className="h-full w-full"
//     >
//       <TileLayer
//         url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`}
//         attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
//         tileSize={512}
//         zoomOffset={-1}
//       />
//       {icon && (
//         <Marker position={location} icon={icon}>
//           <Popup>
//             <strong>Sensor Location</strong>
//             <br />
//             Temp: {temperature !== null ? `${temperature.toFixed(1)}°C` : 'Loading...'}
//           </Popup>
//         </Marker>
//       )}
//     </MapContainer>
//   );
// };

// export default DynamicMap;




// 'use client';

// import React, { useEffect, useRef } from 'react';
// import mapboxgl from 'mapbox-gl';

// type Props = {
//   location: [number, number];
//   temperature: number | null;
//   humidity?: number | null;
// };

// mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// const DynamicMap: React.FC<Props> = ({ location, temperature, humidity }) => {
//   const mapContainerRef = useRef<HTMLDivElement>(null);
//   const mapRef = useRef<mapboxgl.Map | null>(null);

//   useEffect(() => {
//     if (!mapContainerRef.current || !location) return;

//     if (mapRef.current) {
//       mapRef.current.setCenter(location);
//       return;
//     }

//     mapRef.current = new mapboxgl.Map({
//       container: mapContainerRef.current,
//       style: 'mapbox://styles/mapbox/streets-v11',
//       center: location,
//       zoom: 16,
//     });

//     const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
//       <div>
//         <strong>Temperature:</strong> ${temperature ?? 'N/A'}°C<br/>
//         <strong>Humidity:</strong> ${humidity ?? 'N/A'}%
//       </div>
//     `);

//     new mapboxgl.Marker()
//       .setLngLat(location)
//       .setPopup(popup)
//       .addTo(mapRef.current);

//     return () => {
//       mapRef.current?.remove();
//     };
//   }, [location, temperature, humidity]);

//   return <div ref={mapContainerRef} className="h-[500px] w-full rounded-lg" />;
// };

// export default DynamicMap;



'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import { SensorData } from '@/services/sensor';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

interface DynamicMapProps {
  sensorData: SensorData;
  lat: number;
  lng: number;
  usingMock: boolean;
}

export default function DynamicMap({ sensorData, lat, lng, usingMock }: DynamicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Wait until DOM is mounted and container ref is ready
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: 12,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mounted, lat, lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    const marker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup().setHTML(`
          <div>
            <strong>${usingMock ? 'Mock Sensor' : 'Live Sensor'}</strong><br/>
            🌡 Temp: ${sensorData.temperature?.toFixed(1) ?? 'N/A'}°C<br/>
            💧 Humidity: ${sensorData.humidity?.toFixed(1) ?? 'N/A'}%
          </div>
        `)
      )
      .addTo(mapRef.current);

    return () => {
      marker.remove();
    };
  }, [sensorData, lat, lng, usingMock]);

  return <div ref={mapContainerRef} className="w-full h-[500px] rounded-xl shadow" />;
}
