"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (webpack bundles break the default icon paths)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const selectedIcon = new L.Icon({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:    [30, 46],
  iconAnchor:  [15, 46],
  popupAnchor: [0, -46],
  shadowSize:  [46, 46],
  className:   "selected-marker",
});

interface EpostPoint {
  n_code: number;
  name: string;
  city: string;
  street: string;
  house: number;
  remarks?: string;
  type?: string;
  // HFD may return coordinates under various names
  lat?: number; lng?: number;
  latitude?: number; longitude?: number;
  x_wgs84?: number; y_wgs84?: number;
  x?: number; y?: number;
}

function getCoords(p: EpostPoint): [number, number] | null {
  if (p.lat && p.lng)                 return [p.lat, p.lng];
  if (p.latitude && p.longitude)      return [p.latitude, p.longitude];
  if (p.y_wgs84 && p.x_wgs84)        return [p.y_wgs84, p.x_wgs84];
  if (p.y && p.x && p.y > 29 && p.y < 34) return [p.y, p.x]; // rough Israel WGS84 range
  return null;
}

function FitBounds({ points }: { points: EpostPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const coords = points.map(getCoords).filter(Boolean) as [number, number][];
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points]);
  return null;
}

interface Props {
  points: EpostPoint[];
  selected: EpostPoint | null;
  onSelect: (p: EpostPoint) => void;
}

export default function EpostMap({ points, selected, onSelect }: Props) {
  const withCoords = points.filter((p) => getCoords(p) !== null);

  // Fallback: no coordinates available — show nothing (caller handles this)
  if (withCoords.length === 0) return null;

  const center = getCoords(withCoords[0])!;

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%", borderRadius: 12 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={withCoords} />
      {withCoords.map((point) => {
        const coords = getCoords(point)!;
        const isSelected = selected?.n_code === point.n_code;
        return (
          <Marker
            key={point.n_code}
            position={coords}
            icon={isSelected ? selectedIcon : new L.Icon.Default()}
            eventHandlers={{ click: () => onSelect(point) }}
          >
            <Popup>
              <div style={{ textAlign: "right", direction: "rtl", minWidth: 140 }}>
                <strong>{point.name}</strong><br />
                <span style={{ fontSize: 12, color: "#666" }}>{point.street} {point.house}</span>
                {point.remarks && <><br /><span style={{ fontSize: 11, color: "#888" }}>{point.remarks}</span></>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
