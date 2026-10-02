import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import { Screen, EmptyState, Btn } from '../components/ui';
import type { Cart, CartItem } from '../types';

export default function CartScreen({ navigation }: any) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try { setCart(await api.get<Cart | null>('/cart')); }
    catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateQty = async (id: string | null, qty: number) => {
    if (!id) return;
    try {
      setCart(
        qty <= 0
          ? await api.delete<Cart | null>(`/cart/items/${id}`)
          : await api.patch<Cart>(`/cart/items/${id}`, { quantity: qty })
      );
    } catch {}
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={s.item}>
      <View style={{ flex: 1 }}>
        <Text style={s.itemName}>{item.name}</Text>
        <Text style={s.itemPrice}>₹{item.unitPrice} × {item.quantity}</Text>
      </View>
      <View style={s.qtyRow}>
        <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, item.quantity - 1)}>
          <Ionicons name="remove" size={14} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.id, item.quantity + 1)}>
          <Ionicons name="add" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={s.subtotal}>₹{item.subtotal}</Text>
    </View>
  );

  return (
    <Screen>
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <Text style={s.title}>Your Cart</Text>
        {cart && cart.items.length > 0 && (
          <Text style={s.subtitle}>From {cart.restaurant.name}</Text>
        )}
      </View>

      {loading ? (
        <Text style={s.load}>Loading...</Text>
      ) : cart && cart.items.length > 0 ? (
        <>
          <FlatList
            data={cart.items}
            keyExtractor={(i, idx) => i.id || idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={s.list}
          />

          {/* Summary Card */}
          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>₹{cart.subtotal}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Delivery fee</Text>
              <Text style={s.summaryValue}>₹{cart.estimatedDeliveryFee}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>₹{cart.estimatedTotal}</Text>
            </View>
          </View>

          {!cart.meetsMinimum && (
            <Text style={s.warn}>Minimum order is ₹{cart.minOrderAmount}</Text>
          )}

          <Btn
            title={`Checkout  •  ₹${cart.estimatedTotal}`}
            onPress={() => navigation.navigate('Checkout')}
            disabled={!cart.meetsMinimum}
            style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 16 }}
          />
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <EmptyState title="Your cart is empty" message="Browse restaurants to add items." />
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  load: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemPrice: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FBCDD0',
  },
  qtyBtn: {
    padding: 6,
    paddingHorizontal: 8,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 4,
    minWidth: 20,
    textAlign: 'center',
  },
  subtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    minWidth: 52,
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  warn: {
    color: colors.warning,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 16,
  },
});
