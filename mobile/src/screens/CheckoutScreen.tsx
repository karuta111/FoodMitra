import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import { useCartStore } from '../store/cart';
import type { Address, Cart } from '../types';

export default function CheckoutScreen({ navigation }: any) {
  const [addrs, setAddrs]           = useState<Address[]>([]);
  const [sel, setSel]               = useState<string | null>(null);
  const [syncing, setSyncing]       = useState(false);   // syncing cart to DB
  const [syncedCart, setSyncedCart] = useState<Cart | null>(null); // server pricing
  const [placing, setPlacing]       = useState(false);
  const [loadingAddrs, setLoadingAddrs] = useState(true);
  const insets = useSafeAreaInsets();

  const cartItems      = useCartStore((s) => s.items);
  const cartRestaurant = useCartStore((s) => s.restaurant);
  const clearCart      = useCartStore((s) => s.clearCart);

  // ── Load addresses ──────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<Address[]>('/customers/addresses')
      .then((r) => { setAddrs(r); if (r.length > 0) setSel(r[0].id); })
      .catch(() => {})
      .finally(() => setLoadingAddrs(false));
  }, []);

  // ── Sync in-memory cart → DB whenever the address selection changes ─────────
  // This gives us the real delivery fee scoped to that address.
  useEffect(() => {
    if (!cartRestaurant || cartItems.length === 0) return;

    setSyncing(true);
    api.post<Cart>('/cart/sync', {
      restaurantId: cartRestaurant.id,
      items: cartItems.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
    })
      .then((cart) => setSyncedCart(cart))
      .catch(() => {/* keep showing last known totals */})
      .finally(() => setSyncing(false));
  }, [sel, cartRestaurant, cartItems]);

  // ── Place order ─────────────────────────────────────────────────────────────
  const place = async () => {
    if (!sel || !syncedCart) return;
    setPlacing(true);
    try {
      // Cart is already synced to DB — just place the order
      const r = await api.post<{ order: { id: string } }>('/orders', {
        deliveryAddressId: sel,
      });

      // Order placed — wipe the in-memory cart
      clearCart();
      navigation.replace('OrderTracking', { orderId: r.order.id });
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const labelIcon = (label: string) => {
    if (label === 'HOME') return 'home-outline';
    if (label === 'WORK') return 'briefcase-outline';
    return 'location-outline';
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
          <Text style={s.heroTitle}>Checkout</Text>
          <Text style={s.heroSub}>Review and place your order</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery address section */}
        <Text style={s.sectionLabel}>DELIVER TO</Text>

        {loadingAddrs ? (
          <View style={s.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={s.loadingText}>Loading addresses…</Text>
          </View>
        ) : addrs.length === 0 ? (
          <View style={s.emptyAddrCard}>
            <Ionicons name="location-outline" size={28} color={colors.textLight} />
            <Text style={s.emptyAddrText}>No saved addresses</Text>
            <TouchableOpacity
              style={s.addAddrBtn}
              onPress={() => navigation.navigate('AddAddress')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={s.addAddrBtnText}>Add Delivery Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {addrs.map((a) => {
              const isSelected = sel === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[s.addrCard, isSelected && s.addrCardActive]}
                  onPress={() => setSel(a.id)}
                  activeOpacity={0.8}
                >
                  {/* Selection indicator */}
                  <View style={[s.radioOuter, isSelected && s.radioOuterActive]}>
                    {isSelected && <View style={s.radioInner} />}
                  </View>

                  {/* Icon */}
                  <View style={[s.addrIconWrap, isSelected && s.addrIconWrapActive]}>
                    <Ionicons
                      name={labelIcon(a.label) as any}
                      size={18}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                  </View>

                  {/* Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.addrLabel, isSelected && s.addrLabelActive]}>{a.label}</Text>
                    <Text style={s.addrLine1} numberOfLines={1}>{a.line1}</Text>
                    <Text style={s.addrCity}>{a.city}{a.postalCode ? ` – ${a.postalCode}` : ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Add another */}
            <TouchableOpacity
              style={s.addMoreBtn}
              onPress={() => navigation.navigate('AddAddress')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={s.addMoreText}>Add another address</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Payment info */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>PAYMENT</Text>
        <View style={s.paymentCard}>
          <View style={s.paymentRow}>
            <View style={s.paymentIcon}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
            </View>
            <Text style={s.paymentText}>Razorpay (Online)</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        </View>

        {/* Order summary — shows real server-computed pricing */}
        <Text style={[s.sectionLabel, { marginTop: 24 }]}>ORDER SUMMARY</Text>
        <View style={s.summaryCard}>
          {syncing ? (
            <View style={s.summaryLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.summaryLoadingText}>Calculating totals…</Text>
            </View>
          ) : syncedCart ? (
            <>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Subtotal</Text>
                <Text style={s.summaryValue}>₹{syncedCart.subtotal}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Delivery fee</Text>
                <Text style={s.summaryValue}>₹{syncedCart.estimatedDeliveryFee}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.summaryTotal}>Total</Text>
                <Text style={[s.summaryTotal, { color: colors.primary }]}>
                  ₹{syncedCart.estimatedTotal}
                </Text>
              </View>
              {!syncedCart.meetsMinimum && (
                <Text style={s.minWarn}>
                  Minimum order is ₹{syncedCart.minOrderAmount}
                </Text>
              )}
            </>
          ) : (
            <Text style={s.summaryLoadingText}>Add an address to see delivery fee</Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom place order button */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <TouchableOpacity
          style={[
            s.placeBtn,
            (!sel || placing || syncing || !syncedCart || !syncedCart.meetsMinimum) && s.placeBtnDisabled,
          ]}
          onPress={place}
          disabled={!sel || placing || syncing || !syncedCart || !syncedCart.meetsMinimum}
          activeOpacity={0.88}
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="bag-check-outline" size={20} color="#fff" />
              <Text style={s.placeBtnText}>
                Place Order{syncedCart ? `  •  ₹${syncedCart.estimatedTotal}` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 8,
    ...shadow.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyAddrCard: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 10,
    ...shadow.sm,
  },
  emptyAddrText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  addAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  addAddrBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 10,
    ...shadow.sm,
  },
  addrCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFBFB',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  addrIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  addrIconWrapActive: {
    backgroundColor: colors.primaryBg,
  },
  addrLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  addrLabelActive: {
    color: colors.primary,
  },
  addrLine1: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  addrCity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  addMoreText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  // Order summary
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  summaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  summaryLoadingText: {
    fontSize: 13,
    color: colors.textSecondary,
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
  summaryDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 6,
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  minWarn: {
    marginTop: 8,
    fontSize: 12,
    color: colors.warning,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...shadow.lg,
  },
  placeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadow.md,
  },
  placeBtnDisabled: {
    opacity: 0.5,
  },
  placeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
