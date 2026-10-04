import React, { useState, useEffect, useRef } from 'react';
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

// ─── Steps map to real backend OrderStatus values ────────────────────────────
// State machine: PLACED → APPROVED → PAID → DELIVERED  (or any → CANCELLED)
const STEPS = [
  {
    key: 'PLACED',
    label: 'Order Placed',
    sublabel: 'Your order has been received',
    icon: 'receipt-outline' as const,
  },
  {
    key: 'APPROVED',
    label: 'Order Approved',
    sublabel: 'Restaurant confirmed your order',
    icon: 'storefront-outline' as const,
  },
  {
    key: 'PAID',
    label: 'Payment Confirmed',
    sublabel: 'Payment has been verified',
    icon: 'card-outline' as const,
  },
  {
    key: 'DELIVERED',
    label: 'Delivered!',
    sublabel: 'Enjoy your meal',
    icon: 'home-outline' as const,
  },
];

// Terminal statuses — stop polling once reached
const TERMINAL = new Set(['DELIVERED', 'CANCELLED']);

interface TrackingData {
  orderId: string;
  shortCode: string;
  currentStatus: string;
  timeline: { status: string; timestamp: string; note?: string }[];
  rider: { name?: string; phone?: string } | null;
  restaurant: { id: string; name: string };
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentStatus: string;
}

interface OrderDetail {
  id: string;
  shortCode: string;
  orderStatus: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
  restaurant: { id: string; name: string };
  items: {
    id: string;
    itemNameSnapshot: string;
    itemPriceSnapshot: number;
    quantity: number;
    subtotal: number;
    isVeg: boolean;
  }[];
  payment: { status: string; method: string } | null;
  notes?: string;
}

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();

  const loadData = async () => {
    try {
      // Fetch both tracking + full detail in parallel
      const [t, d] = await Promise.all([
        api.get<TrackingData>(`/orders/${orderId}/tracking`),
        api.get<OrderDetail>(`/orders/${orderId}`),
      ]);
      setTracking(t);
      setDetail(d);
      // Stop polling once order reaches a terminal state
      if (TERMINAL.has(t.currentStatus)) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    } catch {}
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
    // Poll every 5 seconds for live status
    intervalRef.current = setInterval(loadData, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const isCancelled = tracking?.currentStatus === 'CANCELLED';

  // For cancelled orders show all steps as inactive; otherwise walk the normal path
  const currentStepIdx = isCancelled
    ? -1
    : STEPS.findIndex((s) => s.key === tracking?.currentStatus);

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() ?? '';
    if (s === 'delivered') return colors.success;
    if (s === 'cancelled') return colors.danger;
    if (s === 'paid') return '#2196F3';
    if (s === 'approved') return '#FF9800';
    return colors.warning;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PLACED':    return 'Order Placed';
      case 'APPROVED':  return 'Approved';
      case 'PAID':      return 'Payment Confirmed';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      default:          return status;
    }
  };

  const formatCurrency = (v: number) => `₹${v.toFixed(2)}`;

  // ── Render ──────────────────────────────────────────────────────────────────
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
            {tracking ? `Order #${tracking.shortCode}` : 'Order Details'}
          </Text>
          {tracking && (
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: getStatusColor(tracking.currentStatus) }]} />
              <Text style={s.heroSub}>{getStatusLabel(tracking.currentStatus)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Loading state */}
      {loading ? (
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadText}>Loading order details…</Text>
        </View>
      ) : !tracking || !detail ? (
        <View style={s.loadWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textLight} />
          <Text style={s.emptyTitle}>Order not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Restaurant summary card ─────────────────────────────────── */}
          <View style={s.card}>
            <View style={s.cardRow}>
              <View style={s.restIcon}>
                <Text style={s.restIconText}>
                  {(tracking.restaurant?.name ?? 'R').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.restName}>{tracking.restaurant?.name}</Text>
                <Text style={s.orderDate}>
                  {new Date(detail.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              {detail.notes ? (
                <View style={s.notesBadge}>
                  <Ionicons name="chatbubble-outline" size={11} color={colors.primary} />
                  <Text style={s.notesText}>Note</Text>
                </View>
              ) : null}
            </View>
            {detail.notes ? (
              <View style={s.notesBox}>
                <Text style={s.notesLabel}>Order note</Text>
                <Text style={s.notesValue}>{detail.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Cancelled banner ────────────────────────────────────────── */}
          {isCancelled && (
            <View style={s.cancelledBanner}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
              <Text style={s.cancelledText}>This order was cancelled</Text>
            </View>
          )}

          {/* ── Delivery progress ───────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>DELIVERY PROGRESS</Text>
            {STEPS.map((step, i) => {
              const isDone = !isCancelled && i <= currentStepIdx;
              const isCurrent = !isCancelled && i === currentStepIdx;
              const isLast = i === STEPS.length - 1;

              return (
                <View key={step.key} style={s.stepRow}>
                  {/* Icon + connector line */}
                  <View style={s.stepLeft}>
                    <View
                      style={[
                        s.stepDot,
                        isDone && s.stepDotDone,
                        isCurrent && s.stepDotCurrent,
                        isCancelled && s.stepDotCancelled,
                      ]}
                    >
                      <Ionicons
                        name={step.icon}
                        size={14}
                        color={isDone || isCurrent ? '#fff' : isCancelled ? colors.danger : colors.textLight}
                      />
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          s.stepLine,
                          isDone && i < currentStepIdx && s.stepLineDone,
                        ]}
                      />
                    )}
                  </View>
                  {/* Label */}
                  <View style={s.stepContent}>
                    <Text
                      style={[
                        s.stepLabel,
                        isDone && s.stepLabelDone,
                        isCurrent && s.stepLabelCurrent,
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text
                      style={[
                        s.stepSublabel,
                        isCurrent && { color: colors.primary },
                      ]}
                    >
                      {step.sublabel}
                    </Text>
                    {/* Show timestamp if this step is in the timeline */}
                    {(() => {
                      const historyEntry = tracking.timeline.find((t) => t.status === step.key);
                      return historyEntry ? (
                        <Text style={s.stepTime}>
                          {new Date(historyEntry.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                          {' · '}
                          {new Date(historyEntry.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short',
                          })}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Items ordered ───────────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>ITEMS ORDERED</Text>
            {detail.items.map((item, idx) => (
              <View key={item.id ?? idx} style={[s.itemRow, idx > 0 && s.itemRowBorder]}>
                {/* Veg / non-veg indicator */}
                <View style={[s.vegDot, { borderColor: item.isVeg ? '#4CAF50' : '#F44336' }]}>
                  <View style={[s.vegDotInner, { backgroundColor: item.isVeg ? '#4CAF50' : '#F44336' }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{item.itemNameSnapshot}</Text>
                  <Text style={s.itemQty}>x{item.quantity}</Text>
                </View>
                <Text style={s.itemPrice}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}
          </View>

          {/* ── Bill breakdown ──────────────────────────────────────────── */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>BILL DETAILS</Text>

            <View style={s.billRow}>
              <Text style={s.billLabel}>Item total</Text>
              <Text style={s.billValue}>{formatCurrency(detail.subtotal)}</Text>
            </View>
            <View style={s.billRow}>
              <Text style={s.billLabel}>Delivery fee</Text>
              <Text style={s.billValue}>{formatCurrency(detail.deliveryFee)}</Text>
            </View>
            {detail.tax > 0 && (
              <View style={s.billRow}>
                <Text style={s.billLabel}>Taxes & charges</Text>
                <Text style={s.billValue}>{formatCurrency(detail.tax)}</Text>
              </View>
            )}
            {detail.discount > 0 && (
              <View style={s.billRow}>
                <Text style={s.billLabel}>Discount</Text>
                <Text style={[s.billValue, { color: colors.success }]}>
                  -{formatCurrency(detail.discount)}
                </Text>
              </View>
            )}
            <View style={s.billDivider} />
            <View style={s.billRow}>
              <Text style={s.billTotal}>Total paid</Text>
              <Text style={s.billTotalValue}>{formatCurrency(detail.totalAmount)}</Text>
            </View>

            {/* Payment method/status pill */}
            {detail.payment && (
              <View style={s.paymentRow}>
                <Ionicons name="card-outline" size={13} color={colors.textMuted} />
                <Text style={s.paymentText}>
                  {detail.payment.method === 'MANUAL' ? 'Cash / Manual' : detail.payment.method}
                  {' · '}
                  <Text style={{
                    color: detail.payment.status === 'CAPTURED' ? colors.success
                      : detail.payment.status === 'PENDING' ? colors.warning
                      : colors.danger,
                  }}>
                    {detail.payment.status === 'CAPTURED' ? 'Paid'
                      : detail.payment.status === 'PENDING' ? 'Pending'
                      : detail.payment.status}
                  </Text>
                </Text>
              </View>
            )}
          </View>

          {/* ── Rider info (if assigned) ────────────────────────────────── */}
          {tracking.rider && (tracking.rider.name || tracking.rider.phone) && (
            <View style={s.card}>
              <Text style={s.sectionTitle}>YOUR RIDER</Text>
              <View style={s.riderRow}>
                <View style={s.riderIcon}>
                  <Ionicons name="bicycle-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.riderName}>{tracking.rider.name ?? 'Rider assigned'}</Text>
                  {tracking.rider.phone && (
                    <Text style={s.riderPhone}>{tracking.rider.phone}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
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
  orderDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  notesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  notesText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  notesBox: {
    marginTop: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: radius.sm,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesValue: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 12,
    marginBottom: 12,
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  // ── Progress stepper ─────────────────────────────────────────────────────
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
    minHeight: 52,
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
  stepDotCancelled: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
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
  stepContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 8,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  stepLabelDone: {
    color: colors.text,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepSublabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 1,
    lineHeight: 16,
  },
  stepTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },
  // ── Items ────────────────────────────────────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  itemQty: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  // ── Bill ─────────────────────────────────────────────────────────────────
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  billLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  billValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  billTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  billTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  paymentText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // ── Rider ────────────────────────────────────────────────────────────────
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  riderPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // ── Misc ─────────────────────────────────────────────────────────────────
  textLight: {
    color: colors.textLight,
  },
});
