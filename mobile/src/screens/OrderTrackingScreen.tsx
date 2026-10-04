import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';

const STEPS = [
  { key: 'PAID', label: 'Order Placed', icon: 'checkmark-circle-outline' },
  { key: 'RESTAURANT_ACCEPTED', label: 'Restaurant Accepted', icon: 'storefront-outline' },
  { key: 'PREPARING', label: 'Preparing Your Food', icon: 'flame-outline' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: 'bag-check-outline' },
  { key: 'PICKED_UP', label: 'Picked Up by Rider', icon: 'bicycle-outline' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'navigate-outline' },
  { key: 'DELIVERED', label: 'Delivered!', icon: 'home-outline' },
];

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const load = () =>
      api.get<any>(`/orders/${orderId}/tracking`)
        .then(setTracking).catch(() => {}).finally(() => setLoading(false));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [orderId]);

  const currentIdx = tracking ? STEPS.findIndex((s) => s.key === tracking.currentStatus) : -1;

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() ?? '';
    if (s.includes('deliver') || s.includes('complet')) return colors.success;
    if (s.includes('cancel')) return colors.danger;
    return colors.warning;
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
          <Text style={s.heroTitle}>
            {tracking ? `Order #${tracking.shortCode}` : 'Order Tracking'}
          </Text>
          {tracking && (
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: getStatusColor(tracking.currentStatus) }]} />
              <Text style={s.heroSub}>
                {tracking.currentStatus.replace(/_/g, ' ').toLowerCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadText}>Loading order details…</Text>
        </View>
      ) : !tracking ? (
        <View style={s.loadWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textLight} />
          <Text style={s.emptyTitle}>Order not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Order summary card */}
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={s.restIcon}>
                <Text style={s.restIconText}>
                  {(tracking.restaurant?.name ?? 'R').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.restName}>{tracking.restaurant?.name}</Text>
                <Text style={s.totalText}>₹{tracking.total}</Text>
              </View>
            </View>
          </View>

          {/* Progress stepper */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>DELIVERY PROGRESS</Text>
            {STEPS.map((step, i) => {
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx;
              const isLast = i === STEPS.length - 1;
              return (
                <View key={step.key} style={s.stepRow}>
                  {/* Left: icon + line */}
                  <View style={s.stepLeft}>
                    <View style={[
                      s.stepDot,
                      done && s.stepDotDone,
                      isCurrent && s.stepDotCurrent,
                    ]}>
                      <Ionicons
                        name={step.icon as any}
                        size={14}
                        color={done ? '#fff' : colors.textLight}
                      />
                    </View>
                    {!isLast && (
                      <View style={[s.stepLine, done && i < currentIdx && s.stepLineDone]} />
                    )}
                  </View>
                  {/* Right: label */}
                  <Text style={[
                    s.stepLabel,
                    done && s.stepLabelDone,
                    isCurrent && s.stepLabelCurrent,
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
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
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  loadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 60,
  },
  loadText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...shadow.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restIconText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  restName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
  },
  stepLeft: {
    alignItems: 'center',
    width: 30,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 14,
    backgroundColor: '#E8E8E8',
    marginTop: 2,
    borderRadius: 1,
  },
  stepLineDone: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.textMuted,
    paddingTop: 6,
    flex: 1,
    lineHeight: 18,
  },
  stepLabelDone: {
    color: colors.text,
    fontWeight: '500',
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
});
