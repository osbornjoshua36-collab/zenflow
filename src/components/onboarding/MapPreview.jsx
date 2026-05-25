import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapPreview({ center, radius }) {
  const radiusMeters = radius * 1609.34;
  return (
    <div className="h-48 rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        <Circle center={center} radius={radiusMeters} pathOptions={{ color: '#E8945A', fillColor: '#E8945A', fillOpacity: 0.15 }} />
      </MapContainer>
    </div>
  );
}