import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, EmptyState, Btn } from '../components/ui';
import type { Address } from '../types';

export default function AddressesScreen({ navigation }: any) {
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setAddrs(await api.get<Address[]>('/customers/addresses')); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const del = async (id: string) => { try { await api.delete(`/customers/addresses/${id}`); load(); } catch {} };
  return (
    <Screen><Header title="Saved Addresses" onBack={() => navigation.goBack()} />
      <FlatList data={addrs} keyExtractor={i => i.id} renderItem={({ item }) => (
        <View style={s.card}><View style={{ flex: 1 }}><Text style={s.label}>{item.label}</Text><Text style={s.line}>{item.line1}</Text><Text style={s.city}>{item.city} {item.postalCode}</Text></View><TouchableOpacity onPress={() => del(item.id)}><Text style={s.del}>Delete</Text></TouchableOpacity></View>
      )} contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={loading ? <Text style={s.load}>Loading...</Text> : <EmptyState title="No saved addresses" />}
      />
      <Btn title="+ Add New Address" onPress={() => navigation.navigate('AddAddress')} style={{ marginHorizontal: 16, marginBottom: 16 }} />
    </Screen>
  );
}
const s = StyleSheet.create({ card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }, label: { fontSize: 11, fontWeight: '600', color: colors.primary }, line: { fontSize: 14, color: colors.text, marginTop: 4 }, city: { fontSize: 12, color: colors.textSecondary, marginTop: 2 }, del: { color: colors.danger, fontSize: 13, fontWeight: '500' }, load: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 } });
