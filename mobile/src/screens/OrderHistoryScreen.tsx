import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import { Screen, EmptyState } from '../components/ui';
import type { Order } from '../types';

export default function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: Order[]; total: number }>('/orders?page=1&pageSize=20');
      setOrders(res.items);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('deliver') || s.includes('complet')) return colors.success;
    if (s.includes('cancel')) return colors.danger;
    return colors.warning;
  };

  return (
    <Screen>
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <Text style={s.title}>Your Orders</Text>
        <Text style={s.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Text style={s.load}>Loading...</Text>
          ) : (
            <EmptyState title="No orders yet" message="Place your first order!" />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
          >
            <View style={s.cardTop}>
              <View style={s.restaurantWrap}>
                <View style={s.logoCircle}>
                  <Text style={s.logoText}>{item.restaurant.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.restName}>{item.restaurant.name}</Text>
                  <Text style={s.code}>Order #{item.shortCode}</Text>
                </View>
              </View>
              <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) + '18' }]}>
                <Text style={[s.statusText, { color: getStatusColor(item.orderStatus) }]}>
                  {item.orderStatus.replace(/_/g, ' ').toLowerCase()}
                </Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.cardBottom}>
              <View style={s.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={s.metaText}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
              <View style={s.metaItem}>
                <Ionicons name="cash-outline" size={12} color={colors.textMuted} />
                <Text style={s.metaText}>₹{item.totalAmount}</Text>
              </View>
              <View style={s.reorderBtn}>
                <Text style={s.reorderText}>View Details</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  load: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 40,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  restaurantWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  restName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  code: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 14,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  reorderBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reorderText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
});
