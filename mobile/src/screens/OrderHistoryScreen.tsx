import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import { Screen, EmptyState } from '../components/ui';
import type { Order } from '../types';

const PAGE_SIZE = 10;

export default function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const isLoadingMoreRef = useRef(false);
  const insets = useSafeAreaInsets();

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      const res = await api.get<{ items: Order[]; total: number; page: number; pageSize: number }>(
        `/orders?page=${pageNum}&pageSize=${PAGE_SIZE}`,
      );
      setTotal(res.total);
      setOrders((prev) => (replace ? res.items : [...prev, ...res.items]));
      setPage(pageNum);
    } catch {}
  }, []);

  // Initial load
  useEffect(() => {
    fetchPage(1, true).finally(() => setLoading(false));
  }, [fetchPage]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, true);
    setRefreshing(false);
  }, [fetchPage]);

  // Load next page
  const onEndReached = useCallback(async () => {
    if (isLoadingMoreRef.current) return;
    if (orders.length >= total) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, [fetchPage, orders.length, total, page]);

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'delivered') return colors.success;
    if (s === 'cancelled') return colors.danger;
    if (s === 'paid') return '#2196F3';
    return colors.warning;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PLACED':     return 'Placed';
      case 'APPROVED':   return 'Approved';
      case 'PAID':       return 'Paid';
      case 'DELIVERED':  return 'Delivered';
      case 'CANCELLED':  return 'Cancelled';
      default:           return status;
    }
  };

  return (
    <Screen>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <Text style={s.title}>Your Orders</Text>
        <Text style={s.subtitle}>
          {total > 0 ? `${total} order${total !== 1 ? 's' : ''}` : 'No orders yet'}
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View style={s.centerWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <EmptyState title="No orders yet" message="Place your first order!" />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={s.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.footerText}>Loading more…</Text>
            </View>
          ) : orders.length > 0 && orders.length >= total ? (
            <Text style={s.endText}>You've seen all orders</Text>
          ) : null
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
                  {getStatusLabel(item.orderStatus)}
                </Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.cardBottom}>
              <View style={s.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                <Text style={s.metaText}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
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
  centerWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  endText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: 16,
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
