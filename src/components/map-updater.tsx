import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

interface MapUpdaterProps {
  center: LatLngExpression;
  zoom: number;
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

export default MapUpdater;