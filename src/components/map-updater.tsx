// src/components/map-updater.tsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

interface MapUpdaterProps {
  center: LatLngExpression;
  zoom: number;
}

/**
 * Component that updates the Leaflet map view when center or zoom props change
 * This avoids the need to remount the map when we want to change views
 */
const MapUpdater: React.FC<MapUpdaterProps> = ({ center, zoom }) => {
  const map = useMap(); // This hook might return null if the map isn't ready

  useEffect(() => {
    // Check if map instance exists before calling methods
    if (map) {
      try {
           // Check if map is already at the target view to avoid unnecessary updates
           const currentCenter = map.getCenter();
           const currentZoom = map.getZoom();
           if (currentCenter.lat !== center[0] || currentCenter.lng !== center[1] || currentZoom !== zoom) {
               console.log("Updating map view:", center, zoom);
               map.setView(center, zoom, {
                 animate: true,
                 duration: 0.8,
               });
           }
      } catch (e) {
           console.error("Error updating map view:", e);
           // Handle potential errors if map methods fail (e.g., during unmount)
      }
    } else {
        console.log("MapUpdater: Map instance not available yet.");
    }
  }, [map, center, zoom]); // Dependencies include map instance

  return null; // This component doesn't render anything
};

export default MapUpdater;
