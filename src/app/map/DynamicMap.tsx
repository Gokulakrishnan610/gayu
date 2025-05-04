'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression, DivIcon } from 'leaflet';

type Props = {
  location: LatLngExpression;
  temperature: number | null;
  icon: DivIcon | null;
};

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

const DynamicMap: React.FC<Props> = ({ location, temperature, icon }) => {
  const mapKey = Array.isArray(location) ? location.join(',') : String(location);

  return (
    <MapContainer
      key={mapKey}
      center={location}
      zoom={13}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`}
        attribution='© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        tileSize={512}
        zoomOffset={-1}
      />
      {icon && (
        <Marker position={location} icon={icon}>
          <Popup>
            <strong>Sensor Location</strong>
            <br />
            Temp: {temperature !== null ? `${temperature.toFixed(1)}°C` : 'Loading...'}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default DynamicMap;
