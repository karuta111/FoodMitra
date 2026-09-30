import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { api, ApiError } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, Btn, Input } from '../components/ui';

export default function AddAddressScreen({ navigation }: any) {
  const [label, setLabel] = useState<'HOME'|'WORK'|'OTHER'>('HOME');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('Pune');
  const [pincode, setPincode] = useState('');
  const [lat, setLat] = useState('18.52');
  const [lng, setLng] = useState('73.85');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try { await api.post('/customers/addresses', { label, line1, city, postalCode: pincode, latitude: parseFloat(lat), longitude: parseFloat(lng) }); navigation.goBack(); }
    catch (e) { alert(e instanceof ApiError ? e.message : 'Failed'); } finally { setSaving(false); }
  };
  return (
    <Screen><Header title="Add Address" onBack={() => navigation.goBack()} />
      <ScrollView style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['HOME','WORK','OTHER'] as const).map(l => <TouchableOpacity key={l} onPress={() => setLabel(l)} style={[s.labelBtn, label === l && s.active]}><Text style={{ color: label === l ? colors.primary : colors.textSecondary }}>{l}</Text></TouchableOpacity>)}
        </View>
        <Input label="Address Line 1 *" value={line1} onChangeText={setLine1} placeholder="Flat 101" />
        <Input label="City *" value={city} onChangeText={setCity} />
        <Input label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="numeric" />
        <Input label="Latitude" value={lat} onChangeText={setLat} keyboardType="numeric" />
        <Input label="Longitude" value={lng} onChangeText={setLng} keyboardType="numeric" />
        <Btn title={saving ? 'Saving...' : 'Save'} onPress={save} loading={saving} disabled={!line1} />
      </ScrollView>
    </Screen>
  );
}
const s = StyleSheet.create({ labelBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }, active: { borderColor: colors.primary, backgroundColor: colors.primaryBg } });
