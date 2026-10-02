import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors, radius, shadow } from '../theme/colors';
import { api } from '../api/client';
import type { Address } from '../types';

const { height: SCREEN_H } = Dimensions.get('window');

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentLat: number;
  currentLng: number;
  onSelect: (lat: number, lng: number, label?: string) => void;
}

export function LocationPickerModal({
  visible,
  onClose,
  currentLat,
  currentLng,
  onSelect,
}: LocationPickerModalProps) {
  const [lat, setLat] = useState(currentLat);
  const [lng, setLng] = useState(currentLng);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const webViewRef = useRef<WebView>(null);

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
          var map = L.map('map', { zoomControl: false }).setView([${currentLat}, ${currentLng}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);
          
          // Custom red icon similar to the app's primary color
          var customIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });
          
          var marker = L.marker([${currentLat}, ${currentLng}], { icon: customIcon }).addTo(map);
          
          map.on('click', function(e) {
            var newLat = e.latlng.lat;
            var newLng = e.latlng.lng;
            marker.setLatLng(e.latlng);
            window.ReactNativeWebView.postMessage(JSON.stringify({ lat: newLat, lng: newLng }));
          });
          
          window.updateMap = function(newLat, newLng) {
            marker.setLatLng([newLat, newLng]);
            map.setView([newLat, newLng], 15);
          };
        </script>
      </body>
    </html>
  `;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setLat(currentLat);
      setLng(currentLng);
      setSearchQuery('');
      setSearchResults([]);
      setLoadingSaved(true);
      api.get<{items: Address[]}>('/customers/addresses')
        .then(res => setSavedAddresses(Array.isArray(res) ? res : (res.items || [])))
        .catch(() => setSavedAddresses([]))
        .finally(() => setLoadingSaved(false));
    }
  }, [visible, currentLat, currentLng]);

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
            'Accept': 'application/json',
            'User-Agent': 'FoodMitraApp/1.0 (contact@foodmitra.com)'
          } 
        });
        if (res.ok) {
          const data = await res.json() as NominatimResult[];
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

  const handleMapPress = (e: any) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      setLat(data.lat);
      setLng(data.lng);
    } catch {}
  };

  const updateWebView = (newLat: number, newLng: number) => {
    webViewRef.current?.injectJavaScript(`window.updateMap(${newLat}, ${newLng}); true;`);
  };

  const pickSearchResult = (r: NominatimResult) => {
    const newLat = parseFloat(r.lat);
    const newLng = parseFloat(r.lon);
    setLat(newLat);
    setLng(newLng);
    setSearchQuery(r.display_name.split(',')[0]);
    setSearchResults([]);
    updateWebView(newLat, newLng);
  };

  const useMyLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(location.coords.latitude);
      setLng(location.coords.longitude);
      updateWebView(location.coords.latitude, location.coords.longitude);
    } catch (e) {
      alert('Could not get your location');
    }
  };

  const confirm = () => {
    onSelect(lat, lng);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
        <View style={s.modalContainer}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Ionicons name="location" size={24} color={colors.primary} />
              <Text style={s.headerTitle}>Your Location</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={s.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder="Search a place (e.g. Rajgurunagar)"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} style={s.searchIconRight} />}
            {searchQuery && !searching && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} style={s.searchIconRight}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown-like view */}
          {searchResults.length > 0 && (
            <View style={s.searchResults}>
              {searchResults.map((r, i) => (
                <TouchableOpacity key={r.place_id} style={[s.resultItem, i === searchResults.length - 1 && { borderBottomWidth: 0 }]} onPress={() => pickSearchResult(r)}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultTitle} numberOfLines={1}>{r.display_name.split(',')[0]}</Text>
                    <Text style={s.resultSub} numberOfLines={1}>{r.display_name.split(',').slice(1).join(',').trim()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <FlatList
            contentContainerStyle={s.scrollContent}
            data={savedAddresses}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              <View style={s.mapSection}>
                <View style={s.mapWrap}>
                  <WebView
                    ref={webViewRef}
                    source={{ html: leafletHTML }}
                    style={s.map}
                    onMessage={handleMapPress}
                    scrollEnabled={false}
                    bounces={false}
                  />
                </View>
                
                <TouchableOpacity style={s.currentLocationBtn} onPress={useMyLocation}>
                  <Ionicons name="locate" size={18} color={colors.primary} />
                  <Text style={s.currentLocationText}>Use my current location</Text>
                </TouchableOpacity>
                <Text style={s.dragHint}>Drag the map or click to set the exact location.</Text>

                {savedAddresses.length > 0 && (
                  <Text style={s.savedTitle}>SAVED ADDRESSES</Text>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const isActive = Math.abs(item.latitude - lat) < 0.001 && Math.abs(item.longitude - lng) < 0.001;
              return (
                <TouchableOpacity
                  style={[s.addressCard, isActive && s.addressCardActive]}
                  onPress={() => {
                    setLat(item.latitude);
                    setLng(item.longitude);
                    setSearchQuery('');
                    updateWebView(item.latitude, item.longitude);
                  }}
                >
                  <View style={s.addressIconWrap}>
                    <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <View style={s.addressDetails}>
                    <View style={s.addressLabelRow}>
                      <View style={s.addressLabelBadge}>
                        <Text style={s.addressLabelText}>{item.label}</Text>
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                    </View>
                    <Text style={s.addressLine1} numberOfLines={1}>{item.line1}</Text>
                    <Text style={s.addressCity} numberOfLines={1}>{item.city} {item.postalCode || ''}</Text>
                  </View>
                </TouchableOpacity>
              )
            }}
            ListEmptyComponent={loadingSaved ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : null}
          />

          <View style={s.footer}>
            <TouchableOpacity style={s.confirmBtn} onPress={confirm}>
              <Text style={s.confirmBtnText}>Confirm location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: SCREEN_H * 0.9,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: -12,
    marginBottom: 16,
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
  scrollContent: {
    paddingBottom: 20,
  },
  mapSection: {
    marginBottom: 16,
  },
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
    marginBottom: 16,
  },
  savedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: 8,
    gap: 12,
  },
  addressCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  addressIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.backgroundGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressDetails: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addressLabelBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  addressLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  addressLine1: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  addressCity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
