import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme/colors';
import { Screen, EmptyState, Btn } from '../components/ui';
import { useCartStore, CartLineItem } from '../store/cart';

// Delivery fee is not known until the address is chosen at checkout.
// Show a placeholder here; the real fee appears on the checkout screen
// after the cart is synced to the server.
const DELIVERY_FEE_PLACEHOLDER = 0;

export default function CartScreen({ navigation }: any) {
  const insets     = useSafeAreaInsets();
  const items      = useCartStore((s) => s.items);
  const restaurant = useCartStore((s) => s.restaurant);
  const setQty     = useCartStore((s) => s.setQty);
  const clearCart  = useCartStore((s) => s.clearCart);
  const subtotal   = useCartStore((s) => s.subtotal);
  const totalItems = useCartStore((s) => s.totalItems);

  const total = subtotal() + DELIVERY_FEE_PLACEHOLDER;
  const hasItems = items.length > 0;

  const renderItem = ({ item }: { item: CartLineItem }) => (
    <View style={s.item}>
      {/* Top row: veg dot + name + subtotal */}
      <View style={s.itemTop}>
        <View style={[s.vegDot, { borderColor: item.isVeg ? colors.veg : colors.nonVeg }]}>
          <View style={[s.vegDotInner, { backgroundColor: item.isVeg ? colors.veg : colors.nonVeg }]} />
        </View>
        <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.itemSubtotal}>₹{item.unitPrice * item.quantity}</Text>
      </View>

      {/* Bottom row: price × qty on left, stepper on right */}
      <View style={s.itemBottom}>
        <Text style={s.itemPrice}>₹{item.unitPrice} × {item.quantity}</Text>

        <View style={s.qtyRow}>
          <TouchableOpacity
            style={s.qtyBtn}
            onPress={() => setQty(item.menuItemId, item.quantity - 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {item.quantity === 1
              ? <Ionicons name="trash-outline" size={15} color={colors.primary} />
              : <Text style={s.qtyMinus}>−</Text>
            }
          </TouchableOpacity>
          <Text style={s.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={s.qtyBtn}
            onPress={() => setQty(item.menuItemId, item.quantity + 1)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Screen>
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <View style={s.headerTop}>
          <Text style={s.title}>Your Cart</Text>
          {hasItems && (
            <TouchableOpacity onPress={clearCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {restaurant && (
          <Text style={s.subtitle}>From {restaurant.name}</Text>
        )}
      </View>

      {hasItems ? (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => i.menuItemId}
            renderItem={renderItem}
            contentContainerStyle={s.list}
          />

          {/* Summary card */}
          <View style={s.summaryCard}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>₹{subtotal()}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Delivery fee</Text>
              <Text style={s.summaryValue}>Calculated at checkout</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Items total</Text>
              <Text style={s.totalValue}>₹{subtotal()}</Text>
            </View>
          </View>

          <Text style={s.feeNote}>
            <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
            {'  '}Delivery fee is calculated based on your address at checkout.
          </Text>

          <Btn
            title={`Proceed to Checkout  •  ₹${subtotal()}`}
            onPress={() => navigation.navigate('Checkout')}
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  clearText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  item: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vegDot: {
    width: 14,
    height: 14,
    borderRadius: 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  vegDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 0,
  },
  itemPrice: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FBCDD0',
    width: 100,                    // fixed width — always shows all 3 elements
  },
  qtyBtn: {
    width: 34,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
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
  qtyMinus: {
    fontSize: 20,
    fontWeight: '300',
    color: colors.primary,
    lineHeight: 22,
  },
  feeNote: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    marginHorizontal: 16,
    lineHeight: 16,
  },
});
