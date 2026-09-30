import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, EmptyState } from '../components/ui';

const STEPS = ['PAID', 'RESTAURANT_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = () => api.get<any>(`/orders/${orderId}/tracking`).then(setTracking).catch(() => {}).finally(() => setLoading(false));
    load(); const t = setInterval(load, 5000); return () => clearInterval(t);
  }, [orderId]);
  if (loading) return <Screen><Header title="Order Tracking" onBack={() => navigation.goBack()} /><Text style={s.load}>Loading...</Text></Screen>;
  if (!tracking) return <Screen><Header title="Order Tracking" onBack={() => navigation.goBack()} /><EmptyState title="Order not found" /></Screen>;
  const idx = STEPS.indexOf(tracking.currentStatus);
  return (
    <Screen><Header title={`#${tracking.shortCode}`} onBack={() => navigation.goBack()} />
      <View style={{ padding: 20, gap: 12 }}>
        <Text style={s.restName}>{tracking.restaurant.name}</Text><Text style={s.total}>Total: ₹{tracking.total}</Text>
        <View style={{ marginTop: 16, gap: 8 }}>
          {STEPS.map((step, i) => {
            const done = i <= idx;
            return <View key={step} style={s.step}><View style={[s.dot, { backgroundColor: done ? colors.success : colors.border }]} /><Text style={{ color: done ? colors.text : colors.textMuted, fontSize: 13 }}>{step.replace(/_/g, ' ').toLowerCase()}</Text></View>;
          })}
        </View>
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({ load: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 }, restName: { fontSize: 20, fontWeight: '700', color: colors.text }, total: { fontSize: 14, color: colors.textSecondary }, step: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dot: { width: 12, height: 12, borderRadius: 6 } });
