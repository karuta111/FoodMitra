import React, { useState, useEffect, useCallback } from 'react';
import { Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, EmptyState } from '../components/ui';
import type { Order } from '../types';

export default function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { const res = await api.get<{ items: Order[]; total: number }>('/orders?page=1&pageSize=20'); setOrders(res.items); } catch {} finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <Screen><Header title="Your Orders" onBack={() => navigation.goBack()} />
      <FlatList data={orders} keyExtractor={i => i.id} renderItem={({ item }) => (
        <TouchableOpacity style={s.card} onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}>
          <Text style={s.code}>#{item.shortCode}</Text><Text style={s.name}>{item.restaurant.name}</Text>
          <Text style={s.status}>{item.orderStatus.replace(/_/g, ' ').toLowerCase()}</Text><Text style={s.amount}>₹{item.totalAmount}</Text>
          <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </TouchableOpacity>
      )} contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={loading ? <Text style={s.load}>Loading...</Text> : <EmptyState title="No orders yet" message="Place your first order!" />}
      />
    </Screen>
  );
}
const s = StyleSheet.create({ card: { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }, code: { fontSize: 12, fontFamily: 'monospace', color: colors.textSecondary }, name: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 4 }, status: { fontSize: 12, color: colors.textSecondary, marginTop: 6 }, amount: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 2 }, date: { fontSize: 11, color: colors.textMuted, marginTop: 4 }, load: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 } });
