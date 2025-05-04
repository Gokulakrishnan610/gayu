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



'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { LatLngExpression, DivIcon } from 'leaflet';
import { Thermometer, Droplets } from 'lucide-react'; // Import icons for popup

// Note: The 'icon' prop is removed as custom icon creation is handled in page.tsx
type Props = {
  location: LatLngExpression;
  temperature: number | null;
  // Add humidity if available and needed in popup
  humidity?: number | null;
  icon: DivIcon | null; // Keep icon prop for the Marker
};

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN; // Ensure this is set in .env.local or similar

const DynamicMap: React.FC<Props> = ({ location, temperature, humidity, icon }) => {
  // Create a unique key based on location to help React re-render if location changes drastically
  const mapKey = Array.isArray(location) ? location.join(',') : String(location);

  return (
    <MapContainer
      key={mapKey} // Use key for potential re-initialization if needed
      center={location}
      zoom={13}
      scrollWheelZoom={true}
      className="h-full w-full rounded-b-lg z-0" // Ensure map is behind skeleton initially
      style={{ backgroundColor: 'hsl(var(--muted))' }} // Match background during load
    >
      {/* Use Mapbox Streets for a potentially cleaner look, requires token */}
      {MAPBOX_ACCESS_TOKEN ? (
         <TileLayer
           url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`}
           attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
         />
      ) : (
         // Fallback to OpenStreetMap if Mapbox token is not available
          <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
      )}

      {/* Display Marker only if icon is created (meaning Leaflet is loaded) */}
      {icon && (
        <Marker position={location} icon={icon}>
          <Popup>
            <div className="p-1 text-sm">
               <h4 className="font-semibold mb-1">Sensor Location</h4>
               <div className="flex items-center gap-1">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  <span>
                    Temp: {temperature !== null ? `${temperature.toFixed(1)}°C` : 'N/A'}
                 </span>
               </div>
              {humidity !== undefined && ( // Check if humidity prop is provided
                 <div className="flex items-center gap-1 mt-1">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span>
                      Humidity: {humidity !== null ? `${humidity.toFixed(1)}%` : 'N/A'}
                    </span>
                 </div>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default DynamicMap;
