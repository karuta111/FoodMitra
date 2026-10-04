import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { api, ApiError } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import { Btn, Input } from '../components/ui';

const DEFAULT_LAT = 18.52;
const DEFAULT_LNG = 73.85;

const LABELS = ['HOME', 'WORK', 'OTHER'] as const;
type LabelType = (typeof LABELS)[number];

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const labelIcon = (l: LabelType) => {
  if (l === 'HOME') return 'home-outline';
  if (l === 'WORK') return 'briefcase-outline';
  return 'location-outline';
};

export default function AddAddressScreen({ navigation }: any) {
  const [label, setLabel] = useState<LabelType>('HOME');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Pune');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const webViewRef = useRef<WebView>(null);

  // Leaflet HTML — initialised with DEFAULT coords; updateMap() is called after picks
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { padding: 0; margin: 0; }
          html, body, #map { height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${DEFAULT_LAT}, ${DEFAULT_LNG}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          var customIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          var marker = L.marker([${DEFAULT_LAT}, ${DEFAULT_LNG}], { icon: customIcon }).addTo(map);

          map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            window.ReactNativeWebView.postMessage(JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }));
          });

          window.updateMap = function(newLat, newLng) {
            marker.setLatLng([newLat, newLng]);
            map.setView([newLat, newLng], 15);
          };
        </script>
      </body>
    </html>
  `;

  // Debounced Nominatim search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'FoodMitraApp/1.0 (contact@foodmitra.com)',
          },
        });
        if (res.ok) {
          const data = (await res.json()) as NominatimResult[];
          setSearchResults(data);
        }
      } catch {
        // silently ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const moveMap = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    webViewRef.current?.injectJavaScript(`window.updateMap(${newLat}, ${newLng}); true;`);
  };

  const handleMapMessage = (e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      setLat(data.lat);
      setLng(data.lng);
    } catch {}
  };

  const pickSearchResult = (r: NominatimResult) => {
    const newLat = parseFloat(r.lat);
    const newLng = parseFloat(r.lon);
    setSearchQuery(r.display_name.split(',')[0]);
    setSearchResults([]);
    moveMap(newLat, newLng);
  };

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      moveMap(loc.coords.latitude, loc.coords.longitude);
    } catch {
      alert('Could not get your location');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/customers/addresses', {
        label,
        line1,
        city,
        postalCode: pincode,
        latitude: lat,
        longitude: lng,
      });
      navigation.goBack();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Red hero header */}
      <View style={[s.hero, { paddingTop: Math.max(insets.top + 4, 16) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.heroTitle}>Add New Address</Text>
          <Text style={s.heroSub}>Fill in your location details</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Label selector */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ADDRESS TYPE</Text>
          <View style={s.labelRow}>
            {LABELS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[s.labelBtn, label === l && s.labelBtnActive]}
                onPress={() => setLabel(l)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={labelIcon(l) as any}
                  size={16}
                  color={label === l ? colors.primary : colors.textSecondary}
                />
                <Text style={[s.labelText, label === l && s.labelTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Map picker ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PIN YOUR LOCATION</Text>
          <View style={s.card}>
            {/* Search box */}
            <View style={s.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder="Search a place (e.g. Rajgurunagar)"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searching && (
                <ActivityIndicator size="small" color={colors.primary} style={s.searchIconRight} />
              )}
              {searchQuery !== '' && !searching && (
                <TouchableOpacity
                  onPress={() => { setSearchQuery(''); setSearchResults([]); }}
                  style={s.searchIconRight}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <View style={s.searchResults}>
                {searchResults.map((r, i) => (
                  <TouchableOpacity
                    key={r.place_id}
                    style={[s.resultItem, i === searchResults.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => pickSearchResult(r)}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.resultTitle} numberOfLines={1}>
                        {r.display_name.split(',')[0]}
                      </Text>
                      <Text style={s.resultSub} numberOfLines={1}>
                        {r.display_name.split(',').slice(1).join(',').trim()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Leaflet map */}
            <View style={s.mapWrap}>
              <WebView
                ref={webViewRef}
                source={{ html: leafletHTML }}
                style={s.map}
                onMessage={handleMapMessage}
                scrollEnabled={false}
                bounces={false}
              />
            </View>

            {/* Use current location */}
            <TouchableOpacity style={s.currentLocationBtn} onPress={useMyLocation}>
              <Ionicons name="locate" size={18} color={colors.primary} />
              <Text style={s.currentLocationText}>Use my current location</Text>
            </TouchableOpacity>
            <Text style={s.dragHint}>Drag the map or tap to set the exact location.</Text>
          </View>
        </View>

        {/* Form fields */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>LOCATION DETAILS</Text>
          <View style={s.card}>
            <Input
              label="Address Line 1 *"
              value={line1}
              onChangeText={setLine1}
              placeholder="Flat 101, Building Name, Street"
            />
            <Input
              label="City *"
              value={city}
              onChangeText={setCity}
              placeholder="City"
            />
            <Input
              label="Pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
              placeholder="411001"
            />
          </View>
        </View>

        {/* Read-only coordinates */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>COORDINATES (auto-filled)</Text>
          <View style={s.card}>
            <View style={s.coordRow}>
              <View style={s.coordField}>
                <Text style={s.coordLabel}>Latitude</Text>
                <View style={s.coordInputWrap}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} style={s.coordIcon} />
                  <Text style={s.coordValue}>{lat.toFixed(6)}</Text>
                </View>
              </View>
              <View style={s.coordDivider} />
              <View style={s.coordField}>
                <Text style={s.coordLabel}>Longitude</Text>
                <View style={s.coordInputWrap}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} style={s.coordIcon} />
                  <Text style={s.coordValue}>{lng.toFixed(6)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <Btn
          title={saving ? 'Saving…' : 'Save Address'}
          onPress={save}
          loading={saving}
          disabled={!line1.trim()}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  content: {
    padding: 16,
    gap: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  labelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#fff',
    ...shadow.sm,
  },
  labelBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelTextActive: {
    color: colors.primary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  // ── Search ──
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchIconRight: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: -6,
    marginBottom: 10,
    maxHeight: 200,
    ...shadow.md,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  resultSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // ── Map ──
  mapWrap: {
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 8,
  },
  currentLocationText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  dragHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // ── Read-only coordinates ──
  coordRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  coordField: {
    flex: 1,
  },
  coordDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  coordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  coordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.backgroundGrey,
    gap: 6,
  },
  coordIcon: {
    opacity: 0.6,
  },
  coordValue: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
