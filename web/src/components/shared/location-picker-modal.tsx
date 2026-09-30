'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, Search, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPicker } from '@/components/shared/map-picker';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SavedAddress {
 id: string;
 label: string;
 line1: string;
 line2: string | null;
 city: string;
 postalCode: string | null;
 latitude: number;
 longitude: number;
}

interface NominatimResult {
 place_id: number;
 display_name: string;
 lat: string;
 lon: string;
 type?: string;
 address?: {
 road?: string;
 neighbourhood?: string;
 suburb?: string;
 city?: string;
 town?: string;
 village?: string;
 state?: string;
 postcode?: string;
 country?: string;
 };
}

interface LocationPickerModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 currentLat: number;
 currentLng: number;
 onSelect: (lat: number, lng: number, label?: string) => void;
}

/**
 * Zepto-style location picker modal:
 * - Search bar with autocomplete dropdown (Nominatim geocoding — free, no API key)
 * - Map with draggable pin (pin jumps to selected search result)
 * - "Use my current location" button (single instance, below the map)
 * - List of saved addresses (one-click select)
 */
export function LocationPickerModal({
 open,
 onOpenChange,
 currentLat,
 currentLng,
 onSelect,
}: LocationPickerModalProps) {
 const [lat, setLat] = useState(currentLat);
 const [lng, setLng] = useState(currentLng);
 const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
 const [loadingSaved, setLoadingSaved] = useState(false);

 // Search state
 const [searchQuery, setSearchQuery] = useState('');
 const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
 const [searching, setSearching] = useState(false);
 const [showDropdown, setShowDropdown] = useState(false);
 const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 useEffect(() => {
 if (open) {
 setLat(currentLat);
 setLng(currentLng);
 setSearchQuery('');
 setSearchResults([]);
 setShowDropdown(false);
 // Fetch saved addresses
 setLoadingSaved(true);
 api.get<SavedAddress[]>('/api/v1/customers/addresses')
 .then(setSavedAddresses)
 .catch(() => setSavedAddresses([]))
 .finally(() => setLoadingSaved(false));
 }
 }, [open, currentLat, currentLng]);

 // Debounced Nominatim search
 useEffect(() => {
 if (!searchQuery || searchQuery.trim().length < 3) {
 setSearchResults([]);
 setShowDropdown(false);
 return;
 }
 if (debounceRef.current) clearTimeout(debounceRef.current);
 debounceRef.current = setTimeout(async () => {
 setSearching(true);
 try {
 const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(searchQuery)}`;
 const res = await fetch(url, {
 headers: { 'Accept': 'application/json' },
 });
 if (res.ok) {
 const data = await res.json() as NominatimResult[];
 setSearchResults(data);
 setShowDropdown(true);
 }
 } catch {
 // Network/CORS — silently ignore
 } finally {
 setSearching(false);
 }
 }, 350);
 return () => {
 if (debounceRef.current) clearTimeout(debounceRef.current);
 };
 }, [searchQuery]);

 const pickSearchResult = (r: NominatimResult) => {
 const newLat = parseFloat(r.lat);
 const newLng = parseFloat(r.lon);
 setLat(newLat);
 setLng(newLng);
 // Use the display_name as a friendly label (shortened)
 const shortLabel = r.display_name.split(',').slice(0, 2).join(', ');
 setSearchQuery(shortLabel);
 setShowDropdown(false);
 toast.success(`Map moved to ${shortLabel}`);
 };

 const useMyLocation = () => {
 if (!navigator.geolocation) {
 toast.error('Geolocation is not supported by your browser');
 return;
 }
 navigator.geolocation.getCurrentPosition(
 (pos) => {
 setLat(pos.coords.latitude);
 setLng(pos.coords.longitude);
 toast.success('Using your current location');
 },
 (err) => toast.error(err.message || 'Could not get your location'),
 { enableHighAccuracy: true, timeout: 10000 },
 );
 };

 const confirm = () => {
 onSelect(lat, lng);
 onOpenChange(false);
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <MapPin className="w-5 h-5 text-orange-500" />
 Your Location
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 {/* Search input with autocomplete dropdown */}
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
 <Input
 placeholder="Search a place (e.g. Rajgurunagar)"
 className="pl-9 pr-9"
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 }}
 onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
 onBlur={() => {
 // Delay so click on dropdown item registers before close
 setTimeout(() => setShowDropdown(false), 200);
 }}
 />
 {searching && (
 <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
 )}
 {searchQuery && !searching && (
 <button
 type="button"
 onClick={() => { setSearchQuery(''); setSearchResults([]); }}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
 >
 <X className="w-4 h-4" />
 </button>
 )}

 {/* Autocomplete dropdown */}
 {showDropdown && searchResults.length > 0 && (
 <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
 {searchResults.map((r) => (
 <button
 key={r.place_id}
 type="button"
 onMouseDown={(e) => {
 e.preventDefault();
 pickSearchResult(r);
 }}
 className="w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-slate-100 last:border-0 flex items-start gap-2"
 >
 <MapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium text-slate-800 truncate">
 {r.display_name.split(',')[0]}
 </p>
 <p className="text-xs text-slate-500 truncate">
 {r.display_name.split(',').slice(1).join(',').trim()}
 </p>
 </div>
 </button>
 ))}
 </div>
 )}
 {showDropdown && searchResults.length === 0 && !searching && searchQuery.length >= 3 && (
 <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-3 text-center text-sm text-slate-500">
 No matching places found. Try a different search.
 </div>
 )}
 </div>

 {/* Map picker — the single "Use my current location" button lives inside MapPicker, below the map */}
 <MapPicker
 latitude={lat}
 longitude={lng}
 onChange={(newLat, newLng) => {
 setLat(newLat);
 setLng(newLng);
 }}
 height="280px"
 />

 {/* Saved addresses */}
 {savedAddresses.length > 0 && (
 <div>
 <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Saved addresses</p>
 <div className="space-y-2">
 {savedAddresses.map((addr) => {
 const isActive = Math.abs(addr.latitude - lat) < 0.001 && Math.abs(addr.longitude - lng) < 0.001;
 return (
 <button
 key={addr.id}
 onClick={() => {
 setLat(addr.latitude);
 setLng(addr.longitude);
 setSearchQuery('');
 }}
 className={cn(
 'w-full text-left p-3 rounded-lg border flex items-start gap-3 transition-colors',
 isActive ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300 bg-white',
 )}
 >
 <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
 <MapPin className="w-4 h-4 text-slate-600" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <Badge variant="secondary" className="text-[10px]">{addr.label}</Badge>
 {isActive && <Check className="w-3.5 h-3.5 text-orange-600" />}
 </div>
 <p className="text-sm text-slate-700 mt-1 truncate">{addr.line1}</p>
 <p className="text-xs text-slate-500 truncate">{addr.city} {addr.postalCode}</p>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* Confirm button */}
 <Button onClick={confirm} className="w-full bg-orange-500 hover:bg-orange-600">
 Confirm location
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
