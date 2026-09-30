import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { api, ApiError } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, Btn } from '../components/ui';
import type { Address } from '../types';

export default function CheckoutScreen({ navigation }: any) {
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  useEffect(() => { api.get<Address[]>('/customers/addresses').then(r => { setAddrs(r); if (r.length > 0) setSel(r[0].id); }).catch(() => {}); }, []);
  const place = async () => {
    if (!sel) return; setPlacing(true);
    try {
      const r = await api.post<{ order: { id: string }; payment: { razorpayOrderId: string } }>('/orders', { deliveryAddressId: sel, paymentMethod: 'RAZORPAY' });
      try { await api.post('/payments/verify', { razorpayOrderId: r.payment.razorpayOrderId, razorpayPaymentId: `pay_mock_${Date.now()}`, razorpaySignature: 'mock' }); } catch {}
      navigation.replace('OrderTracking', { orderId: r.order.id });
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Failed'); } finally { setPlacing(false); }
  };
  return (
    <Screen><Header title="Checkout" onBack={() => navigation.goBack()} />
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Select address</Text>
        {addrs.length === 0 ? <TouchableOpacity onPress={() => navigation.navigate('AddAddress')}><Text style={{ color: colors.primary }}>+ Add address</Text></TouchableOpacity> :
          addrs.map(a => (<TouchableOpacity key={a.id} style={[s.addr, sel === a.id && s.active]} onPress={() => setSel(a.id)}><Text style={s.label}>{a.label}</Text><Text style={s.line}>{a.line1}</Text><Text style={s.city}>{a.city} {a.postalCode}</Text></TouchableOpacity>))
        }
        <Btn title={placing ? 'Placing...' : 'Place Order'} onPress={place} loading={placing} disabled={!sel} />
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({ addr: { backgroundColor: colors.white, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }, active: { borderColor: colors.primary, backgroundColor: colors.primaryBg }, label: { fontSize: 11, fontWeight: '600', color: colors.primary }, line: { fontSize: 14, color: colors.text, marginTop: 4 }, city: { fontSize: 12, color: colors.textSecondary, marginTop: 2 } });
