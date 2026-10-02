import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import { Btn, Input } from '../components/ui';

const LABELS = ['HOME', 'WORK', 'OTHER'] as const;
type LabelType = (typeof LABELS)[number];

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
  const [lat, setLat] = useState('18.52');
  const [lng, setLng] = useState('73.85');
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/customers/addresses', {
        label, line1, city, postalCode: pincode,
        latitude: parseFloat(lat), longitude: parseFloat(lng),
      });
      navigation.goBack();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to save address');
    } finally { setSaving(false); }
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

        <View style={s.section}>
          <Text style={s.sectionTitle}>COORDINATES (optional)</Text>
          <View style={s.card}>
            <Input
              label="Latitude"
              value={lat}
              onChangeText={setLat}
              keyboardType="numeric"
              placeholder="18.52"
            />
            <Input
              label="Longitude"
              value={lng}
              onChangeText={setLng}
              keyboardType="numeric"
              placeholder="73.85"
            />
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
});
