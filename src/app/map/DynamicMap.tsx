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



// 'use client';

// import 'mapbox-gl/dist/mapbox-gl.css';
// import mapboxgl from 'mapbox-gl';
// import { useEffect, useRef, useState } from 'react';
// import { SensorData } from '@/services/sensor';

// mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// interface DynamicMapProps {
//   sensorData: SensorData;
//   lat: number;
//   lng: number;
//   usingMock: boolean;
// }

// export default function DynamicMap({ sensorData, lat, lng, usingMock }: DynamicMapProps) {
//   const mapContainerRef = useRef<HTMLDivElement>(null);
//   const mapRef = useRef<mapboxgl.Map | null>(null);
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     // Wait until DOM is mounted and container ref is ready
//     setMounted(true);
//   }, []);

//   useEffect(() => {
//     if (!mounted || !mapContainerRef.current || mapRef.current) return;

//     mapRef.current = new mapboxgl.Map({
//       container: mapContainerRef.current,
//       style: 'mapbox://styles/mapbox/streets-v11',
//       center: [lng, lat],
//       zoom: 12,
//     });

//     return () => {
//       mapRef.current?.remove();
//       mapRef.current = null;
//     };
//   }, [mounted, lat, lng]);

//   useEffect(() => {
//     if (!mapRef.current) return;

//     const marker = new mapboxgl.Marker()
//       .setLngLat([lng, lat])
//       .setPopup(
//         new mapboxgl.Popup().setHTML(`
//           <div>
//             <strong>${usingMock ? 'Mock Sensor' : 'Live Sensor'}</strong><br/>
//             🌡 Temp: ${sensorData.temperature?.toFixed(1) ?? 'N/A'}°C<br/>
//             💧 Humidity: ${sensorData.humidity?.toFixed(1) ?? 'N/A'}%
//           </div>
//         `)
//       )
//       .addTo(mapRef.current);

//     return () => {
//       marker.remove();
//     };
//   }, [sensorData, lat, lng, usingMock]);

//   return <div ref={mapContainerRef} className="w-full h-[500px] rounded-xl shadow" />;
// }
















// 'use client';

// import 'mapbox-gl/dist/mapbox-gl.css';
// import mapboxgl from 'mapbox-gl';
// import { useEffect, useRef, useState } from 'react';
// import { SensorData } from '@/services/sensor';

// // Check if the environment variable is set. If not, provide a default/dummy key or log an error.
// // Ensure this variable is prefixed with NEXT_PUBLIC_ to be available client-side.
// const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// if (!MAPBOX_ACCESS_TOKEN) {
//   console.error('Mapbox Access Token is missing. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.');
//   // Optionally provide a fallback dummy token for local dev, but it won't load real maps.
//   // mapboxgl.accessToken = 'YOUR_DUMMY_FALLBACK_TOKEN'; // Uncomment and replace if needed for dev
// } else {
//   mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
// }


// interface DynamicMapProps {
//   sensorData: SensorData;
//   lat: number;
//   lng: number;
//   usingMock: boolean;
// }

// export default function DynamicMap({ sensorData, lat, lng, usingMock }: DynamicMapProps) {
//   const mapContainerRef = useRef<HTMLDivElement>(null);
//   const mapRef = useRef<mapboxgl.Map | null>(null);
//   const markerRef = useRef<mapboxgl.Marker | null>(null); // Ref for the marker
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     // Wait until DOM is mounted and container ref is ready
//     setMounted(true);
//   }, []);

//   useEffect(() => {
//     // Ensure Mapbox token is set
//     if (!mapboxgl.accessToken) {
//       console.error("Mapbox token not configured. Map cannot be initialized.");
//       return;
//     }

//     // Check for valid container, mounted state, and valid coordinates
//     if (!mounted || !mapContainerRef.current || typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
//         console.log("Map conditions not met or invalid coords:", { mounted, lat, lng, hasContainer: !!mapContainerRef.current });
//         return;
//     }

//     // Prevent re-initialization
//     if (mapRef.current) {
//         console.log("Map already initialized, updating center.");
//         mapRef.current.setCenter([lng, lat]);
//         return;
//     }

//     console.log("Initializing Mapbox map with center:", [lng, lat]);
//     try {
//         mapRef.current = new mapboxgl.Map({
//           container: mapContainerRef.current,
//           style: 'mapbox://styles/mapbox/streets-v11',
//           center: [lng, lat], // Use validated lng, lat
//           zoom: 12,
//         });

//          // Add navigation controls
//          mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

//     } catch (error) {
//         console.error("Error initializing Mapbox map:", error);
//          // If initialization fails, clear the ref
//          mapRef.current = null;
//     }


//     // Cleanup function
//     return () => {
//       console.log("Cleaning up Mapbox map instance.");
//       // Check if map instance exists before removing
//        if (mapRef.current) {
//          mapRef.current.remove();
//          mapRef.current = null;
//        }
//        if (markerRef.current) {
//           markerRef.current.remove();
//           markerRef.current = null;
//        }
//     };
//     // Include mounted state and container ref availability indirectly via the check
//   }, [mounted, lat, lng]); // Depend on mount status and coordinates


//   // Effect to update or create marker when data/location changes
//   useEffect(() => {
//      // Ensure map instance exists and coordinates are valid
//      if (!mapRef.current || typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
//         return;
//      }

//      const popupContent = `
//        <div>
//          <strong>${usingMock ? 'Mock Sensor' : 'Live Sensor'}</strong><br/>
//          🌡 Temp: ${sensorData.temperature?.toFixed(1) ?? 'N/A'}°C<br/>
//          💧 Humidity: ${sensorData.humidity?.toFixed(1) ?? 'N/A'}%
//        </div>
//      `;

//      // If marker exists, update its position and popup
//      if (markerRef.current) {
//          console.log("Updating marker position to:", [lng, lat]);
//          markerRef.current.setLngLat([lng, lat]);
//          markerRef.current.getPopup().setHTML(popupContent);
//      } else {
//          // Create a new marker if it doesn't exist
//          console.log("Creating new marker at:", [lng, lat]);
//          markerRef.current = new mapboxgl.Marker()
//              .setLngLat([lng, lat])
//              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent)) // Add offset for popup
//              .addTo(mapRef.current);
//      }

//      // No specific cleanup needed here as the main map cleanup handles the marker removal
//   }, [sensorData, lat, lng, usingMock, mounted]); // Depend on data and location


//   return <div ref={mapContainerRef} className="w-full h-full rounded-b-lg" />; // Ensure h-full works with parent context
// }





'use client';

import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import type { SensorData } from '@/services/sensor'; // Use type import

// Check if the environment variable is set. If not, provide a default/dummy key or log an error.
// Ensure this variable is prefixed with NEXT_PUBLIC_ to be available client-side.
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (!MAPBOX_ACCESS_TOKEN) {
  console.error('Mapbox Access Token is missing. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable.');
  // Optionally provide a fallback dummy token for local dev, but it won't load real maps.
  // mapboxgl.accessToken = 'YOUR_DUMMY_FALLBACK_TOKEN'; // Uncomment and replace if needed for dev
} else {
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
}


interface DynamicMapProps {
  sensorData: SensorData;
  lat: number | null | undefined; // Allow null or undefined
  lng: number | null | undefined; // Allow null or undefined
  usingMock: boolean;
}

export default function DynamicMap({ sensorData, lat, lng, usingMock }: DynamicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null); // Ref for the marker
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Wait until DOM is mounted and container ref is ready
    setMounted(true);
  }, []);

  useEffect(() => {
    // Ensure Mapbox token is set
    if (!mapboxgl.accessToken) {
      console.error("Mapbox token not configured. Map cannot be initialized.");
      return;
    }

    // Check for valid container, mounted state, and *valid numeric coordinates*
    if (!mounted || !mapContainerRef.current || typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
        console.log("Map conditions not met or invalid coords:", { mounted, lat, lng, hasContainer: !!mapContainerRef.current });
        // If coordinates are invalid/null/undefined, don't initialize or update the map yet
        return;
    }

    // Prevent re-initialization if map already exists
    if (mapRef.current) {
        console.log("Map already initialized, updating center to:", [lng, lat]);
        mapRef.current.setCenter([lng, lat]);
        // No return here, marker update should still happen in the next effect
    } else {
        // Initialize map only if it doesn't exist and coordinates are valid
        console.log("Initializing Mapbox map with center:", [lng, lat]);
        try {
            mapRef.current = new mapboxgl.Map({
              container: mapContainerRef.current,
              style: 'mapbox://styles/mapbox/streets-v11',
              center: [lng, lat], // Use validated lng, lat
              zoom: 12,
            });

             // Add navigation controls
             mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        } catch (error) {
            console.error("Error initializing Mapbox map:", error);
             // If initialization fails, clear the ref
             mapRef.current = null;
        }
    }

    // Cleanup function
    return () => {
      console.log("Cleaning up Mapbox map instance.");
      // Check if map instance exists before removing
       if (mapRef.current) {
         mapRef.current.remove();
         mapRef.current = null;
       }
       if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
       }
    };
    // Depend on mount status and valid coordinates
  }, [mounted, lat, lng]);


  // Effect to update or create marker when data/location changes
  useEffect(() => {
     // Ensure map instance exists and coordinates are valid numbers
     if (!mapRef.current || typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
        return;
     }

     const popupContent = `
       <div>
         <strong>${usingMock ? 'Mock Sensor' : 'Live Sensor'}</strong><br/>
         🌡 Temp: ${sensorData.temperature?.toFixed(1) ?? 'N/A'}°C<br/>
         💧 Humidity: ${sensorData.humidity?.toFixed(1) ?? 'N/A'}%
       </div>
     `;

     // If marker exists, update its position and popup
     if (markerRef.current) {
         console.log("Updating marker position to:", [lng, lat]);
         markerRef.current.setLngLat([lng, lat]);
         // Ensure popup exists before setting HTML
         const popup = markerRef.current.getPopup();
         if (popup) {
            popup.setHTML(popupContent);
         } else {
             // If popup doesn't exist for some reason, create it
             markerRef.current.setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent));
         }
     } else {
         // Create a new marker if it doesn't exist
         console.log("Creating new marker at:", [lng, lat]);
         markerRef.current = new mapboxgl.Marker()
             .setLngLat([lng, lat])
             .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent)) // Add offset for popup
             .addTo(mapRef.current);
     }

     // No specific cleanup needed here as the main map cleanup handles the marker removal
  }, [sensorData, lat, lng, usingMock, mounted]); // Depend on data and valid coordinates


  return <div ref={mapContainerRef} className="w-full h-full rounded-b-lg" />; // Ensure h-full works with parent context
}

    