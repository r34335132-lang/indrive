import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import { fetchRoute } from '../lib/api';
import type { Ride } from '../lib/types';

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [36, 36] });
  }, [map, points]);
  return null;
}

export function TripMap({ ride }: { ride: Ride }) {
  const from: [number, number] = [ride.origin_lat, ride.origin_lng];
  const to: [number, number] = [ride.destination_lat, ride.destination_lng];
  const [route, setRoute] = useState<[number, number][] | null>(null);

  useEffect(() => {
    let alive = true;
    setRoute(null);
    void fetchRoute({ lat: from[0], lng: from[1] }, { lat: to[0], lng: to[1] }).then((r) => {
      if (alive) setRoute(r);
    });
    return () => {
      alive = false;
    };
  }, [ride.id]);

  const line = route ?? [from, to];

  return (
    <MapContainer
      center={from}
      zoom={13}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="h-64 w-full"
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      <Polyline positions={line} pathOptions={{ color: '#0b2545', weight: 8, opacity: 0.25 }} />
      <Polyline
        positions={line}
        pathOptions={{ color: '#17a9b1', weight: 4.5, dashArray: route ? undefined : '6 8' }}
      />
      <CircleMarker center={from} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#138a68', fillOpacity: 1 }} />
      <CircleMarker center={to} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#e11d48', fillOpacity: 1 }} />
      <FitBounds points={line} />
    </MapContainer>
  );
}
