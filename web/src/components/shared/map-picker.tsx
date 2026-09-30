'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

interface MapPickerProps {
 latitude: number;
 longitude: number;
 onChange: (lat: number, lng: number) => void;
 height?: string;
 className?: string;
}

/**
 * MapPicker — Leaflet + OpenStreetMap based draggable pin picker.
 * No API key required. Loads Leaflet dynamically to avoid SSR issues.
 */
export function MapPicker({ latitude, longitude, onChange, height = '300px', className = '' }: MapPickerProps) {
 const containerRef = useRef<HTMLDivElement>(null);
 const mapRef = useRef<LeafletMap | null>(null);
 const markerRef = useRef<LeafletMarker | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;

 async function init() {
 try {
 // Dynamic import — Leaflet accesses `window` at import time
 const L = (await import('leaflet')).default;

 // Load Leaflet CSS
 if (!document.querySelector('#leaflet-css')) {
 const link = document.createElement('link');
 link.id = 'leaflet-css';
 link.rel = 'stylesheet';
 link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
 link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
 link.crossOrigin = '';
 document.head.appendChild(link);
 }

 if (cancelled || !containerRef.current) return;

 // Initialize map
 const map = L.map(containerRef.current).setView([latitude, longitude], 14);
 mapRef.current = map;

 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
 attribution: '© OpenStreetMap contributors',
 maxZoom: 19,
 }).addTo(map);

 // Custom marker icon (Leaflet's default icon path breaks with bundlers)
 const icon = L.divIcon({
 html: '<div style="font-size: 32px; line-height: 1; transform: translate(-50%, -100%);">📍</div>',
 className: '',
 iconSize: [32, 32],
 iconAnchor: [16, 32],
 });

 const marker = L.marker([latitude, longitude], { icon, draggable: true }).addTo(map);
 markerRef.current = marker;

 marker.on('dragend', () => {
 const pos = marker.getLatLng();
 onChange(pos.lat, pos.lng);
 });

 // Click on map to move the pin
 map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
 marker.setLatLng([e.latlng.lat, e.latlng.lng]);
 onChange(e.latlng.lat, e.latlng.lng);
 });

 setLoading(false);
 } catch (e) {
 setError(e instanceof Error ? e.message : 'Failed to load map');
 setLoading(false);
 }
 }

 init();

 return () => {
 cancelled = true;
 if (mapRef.current) {
 mapRef.current.remove();
 mapRef.current = null;
 markerRef.current = null;
 }
 };
 }, []);

 // Update marker position when lat/lng props change externally (e.g., from "Use current location")
 useEffect(() => {
 if (mapRef.current && markerRef.current) {
 markerRef.current.setLatLng([latitude, longitude]);
 mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
 }
 }, [latitude, longitude]);

 const useMyLocation = () => {
 if (!navigator.geolocation) {
 setError('Geolocation is not supported by your browser');
 return;
 }
 navigator.geolocation.getCurrentPosition(
 (pos) => {
 const { latitude: lat, longitude: lng } = pos.coords;
 if (mapRef.current && markerRef.current) {
 markerRef.current.setLatLng([lat, lng]);
 mapRef.current.setView([lat, lng], 15);
 }
 onChange(lat, lng);
 },
 (err) => {
 setError(err.message || 'Could not get your location');
 },
 { enableHighAccuracy: true, timeout: 10000 },
 );
 };

 return (
 <div className={className}>
 <div className="relative" style={{ height }}>
 {loading && (
 <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg z-[1000]">
 <span className="text-sm text-slate-500">Loading map…</span>
 </div>
 )}
 {error && (
 <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg z-[1000]">
 <span className="text-sm text-red-600">{error}</span>
 </div>
 )}
 <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" style={{ zIndex: 0 }} />
 </div>
 <button
 type="button"
 onClick={useMyLocation}
 className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white text-orange-600 border-2 border-orange-300 rounded-lg text-sm font-medium hover:bg-orange-50 hover:border-orange-400 transition-colors"
 >
 <CrosshairIcon className="w-4 h-4" />
 Use my current location
 </button>
 <p className="mt-1 text-xs text-slate-500">
 Drag the pin or click on the map to set the exact location.
 </p>
 </div>
 );
}

function CrosshairIcon({ className }: { className?: string }) {
 return (
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
 <circle cx="12" cy="12" r="10" />
 <line x1="22" y1="12" x2="18" y2="12" />
 <line x1="6" y1="12" x2="2" y2="12" />
 <line x1="12" y1="6" x2="12" y2="2" />
 <line x1="12" y1="22" x2="12" y2="18" />
 <circle cx="12" cy="12" r="3" fill="currentColor" />
 </svg>
 );
}
