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
  const map = useMap();
  
  useEffect(() => {
    if (map) {
      map.setView(center, zoom, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [map, center, zoom]);
  
  return null; // This component doesn't render anything
};

export default MapUpdater;