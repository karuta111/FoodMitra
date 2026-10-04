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

const PAGE_SIZE = 15;

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const isLoadingMoreRef = useRef(false);
  const insets = useSafeAreaInsets();

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      const res = await api.get<{ items: any[]; total: number; page: number; pageSize: number }>(
        `/notifications?page=${pageNum}&pageSize=${PAGE_SIZE}`,
      );
      setTotal(res.total);
      setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
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
    if (items.length >= total) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, [fetchPage, items.length, total, page]);

  // Mark a single notification as read and update local state
  const markRead = useCallback(async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {}
  }, []);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  }, []);

  const unreadCount = items.filter((i) => !i.isRead).length;

  const notifIcon = (type?: string): any => {
    if (type === 'ORDER_PLACED')           return 'receipt-outline';
    if (type === 'PAYMENT_SUCCESSFUL')     return 'card-outline';
    if (type === 'RESTAURANT_ACCEPTED')    return 'storefront-outline';
    if (type === 'RESTAURANT_REJECTED')    return 'close-circle-outline';
    if (type === 'PREPARING')              return 'flame-outline';
    if (type === 'READY')                  return 'bag-check-outline';
    if (type === 'RIDER_ASSIGNED')         return 'bicycle-outline';
    if (type === 'PICKED_UP')              return 'bicycle-outline';
    if (type === 'OUT_FOR_DELIVERY')       return 'navigate-outline';
    if (type === 'DELIVERED')              return 'home-outline';
    if (type === 'CANCELLED' || type === 'CUSTOMER_CANCELLATION') return 'close-circle-outline';
    if (type?.startsWith('PROMO'))         return 'pricetag-outline';
    if (type === 'REFUND_EVENT')           return 'cash-outline';
    if (type === 'PAYMENT_ISSUE')          return 'alert-circle-outline';
    return 'notifications-outline';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Red hero header */}
      <View style={[s.hero, { paddingTop: Math.max(insets.top + 4, 16) }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.heroTitle}>Notifications</Text>
          {unreadCount > 0 ? (
            <Text style={s.heroSub}>{unreadCount} unread</Text>
          ) : total > 0 ? (
            <Text style={s.heroSub}>{total} notification{total !== 1 ? 's' : ''}</Text>
          ) : null}
        </View>
        {/* Mark all read button */}
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead} activeOpacity={0.75}>
            <Ionicons name="checkmark-done-outline" size={14} color="#fff" />
            <Text style={s.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
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
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <Ionicons name="notifications-outline" size={40} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>No notifications</Text>
              <Text style={s.emptySub}>
                You're all caught up! We'll notify you when something arrives.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={s.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.footerText}>Loading more…</Text>
            </View>
          ) : items.length > 0 && items.length >= total ? (
            <Text style={s.endText}>You've seen all notifications</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, !item.isRead && s.cardUnread]}
            activeOpacity={item.isRead ? 1 : 0.8}
            onPress={() => {
              if (!item.isRead) markRead(item.id);
            }}
          >
            {!item.isRead && <View style={s.unreadBar} />}
            <View style={[s.iconWrap, !item.isRead && s.iconWrapActive]}>
              <Ionicons
                name={notifIcon(item.type)}
                size={20}
                color={!item.isRead ? colors.primary : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.notifTitle, !item.isRead && s.notifTitleUnread]}>
                {item.title}
              </Text>
              {item.body ? (
                <Text style={s.notifBody} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={s.notifTime}>
                {new Date(item.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {!item.isRead && (
              <View style={s.unreadDot} />
            )}
          </TouchableOpacity>
        )}
      />
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
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
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardUnread: {
    borderColor: '#FBCDD0',
    backgroundColor: '#FFFBFB',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
    flexShrink: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryBg,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 19,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifBody: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 5,
  },
});
