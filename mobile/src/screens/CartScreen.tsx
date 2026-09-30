import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, EmptyState, Btn } from '../components/ui';
import type { Cart, CartItem } from '../types';

export default function CartScreen({ navigation }: any) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setCart(await api.get<Cart | null>('/cart')); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const updateQty = async (id: string | null, qty: number) => { if (!id) return; try { setCart(qty <= 0 ? await api.delete<Cart | null>(`/cart/items/${id}`) : await api.patch<Cart>(`/cart/items/${id}`, { quantity: qty })); } catch {} };
  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={s.item}><View style={{ flex: 1 }}><Text style={s.itemName}>{item.name}</Text><Text style={s.itemPrice}>₹{item.unitPrice}</Text></View>
      <View style={s.qty}><TouchableOpacity onPress={() => updateQty(item.id, item.quantity - 1)}><Text style={s.qtyBtn}>−</Text></TouchableOpacity><Text style={s.qtyText}>{item.quantity}</Text><TouchableOpacity onPress={() => updateQty(item.id, item.quantity + 1)}><Text style={s.qtyBtn}>+</Text></TouchableOpacity></View>
      <Text style={s.subtotal}>₹{item.subtotal}</Text>
    </View>
  );
  if (loading) return <Screen><Header title="Your Cart" onBack={() => navigation.goBack()} /><Text style={s.load}>Loading...</Text></Screen>;
  return (
    <Screen><Header title="Your Cart" onBack={() => navigation.goBack()} />
      {cart && cart.items.length > 0 ? (
        <>
          <Text style={s.restInfo}>Order from {cart.restaurant.name}</Text>
          <FlatList data={cart.items} keyExtractor={(i, idx) => i.id || idx.toString()} renderItem={renderItem} contentContainerStyle={{ paddingHorizontal: 16 }} />
          <View style={s.summary}><View style={s.row}><Text style={s.lbl}>Subtotal</Text><Text>₹{cart.subtotal}</Text></View><View style={s.row}><Text style={s.lbl}>Delivery fee</Text><Text>₹{cart.estimatedDeliveryFee}</Text></View><View style={s.total}><Text style={s.lblT}>Total</Text><Text style={s.valT}>₹{cart.estimatedTotal}</Text></View></View>
          {!cart.meetsMinimum && <Text style={s.warn}>Minimum order is ₹{cart.minOrderAmount}</Text>}
          <Btn title={`Checkout • ₹${cart.estimatedTotal}`} onPress={() => navigation.navigate('Checkout')} disabled={!cart.meetsMinimum} style={{ marginHorizontal: 16, marginTop: 12 }} />
        </>
      ) : <EmptyState title="Your cart is empty" message="Browse restaurants to add items." />}
    </Screen>
  );
}
const s = StyleSheet.create({
  load: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 }, restInfo: { fontSize: 13, color: colors.primary, fontWeight: '500', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primaryBg },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  itemName: { fontSize: 14, fontWeight: '500', color: colors.text }, itemPrice: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  qty: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryBg, borderRadius: 8, paddingHorizontal: 4, marginHorizontal: 8 }, qtyBtn: { fontSize: 18, color: colors.primary, paddingHorizontal: 8 }, qtyText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  subtotal: { fontSize: 14, fontWeight: '600', color: colors.text, minWidth: 50, textAlign: 'right' },
  summary: { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginHorizontal: 16, borderWidth: 1, borderColor: colors.border }, row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }, lbl: { fontSize: 14, color: colors.textSecondary },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }, lblT: { fontSize: 16, fontWeight: '700', color: colors.text }, valT: { fontSize: 16, fontWeight: '700', color: colors.text },
  warn: { color: colors.warning, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
