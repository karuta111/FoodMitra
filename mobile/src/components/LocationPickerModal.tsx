import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme/colors';
import { api } from '../api/client';
import type { Address } from '../types';

const { height: SCREEN_H } = Dimensions.get('window');

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentLat: number;
  currentLng: number;
  onSelect: (lat: number, lng: number, label: string) => void;
}

/** Returns a short display string for the deliver-to pill */
export function shortAddressLabel(address: Address): string {
  // Use first meaningful part of line1, truncated to ~22 chars
  const line1 = address.line1?.trim();
  if (line1) {
    return line1.length > 22 ? line1.slice(0, 20).trimEnd() + '…' : line1;
  }
  return address.city || address.label;
}

export function LocationPickerModal({
  visible,
  onClose,
  currentLat,
  currentLng,
  onSelect,
}: LocationPickerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api
      .get<{ items: Address[] }>('/customers/addresses')
      .then((res) => {
        const list = Array.isArray(res) ? res : res.items ?? [];
        setSavedAddresses(list);
        // Pre-select whichever address matches current coords
        const match = list.find(
          (a) =>
            Math.abs(a.latitude - currentLat) < 0.001 &&
            Math.abs(a.longitude - currentLng) < 0.001,
        );
        if (match) {
          setSelectedId(match.id);
          setSelectedAddress(match);
        } else {
          setSelectedId(null);
          setSelectedAddress(null);
        }
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setLoading(false));
  }, [visible, currentLat, currentLng]);

  const confirm = () => {
    if (selectedAddress) {
      onSelect(
        selectedAddress.latitude,
        selectedAddress.longitude,
        shortAddressLabel(selectedAddress),
      );
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.overlay}
      >
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Ionicons name="location" size={22} color={colors.primary} />
              <Text style={s.headerTitle}>Choose Delivery Address</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Saved addresses list */}
          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: 40 }}
            />
          ) : savedAddresses.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons
                name="location-outline"
                size={40}
                color={colors.border}
              />
              <Text style={s.emptyText}>No saved addresses yet.</Text>
              <Text style={s.emptyHint}>
                Add one from your profile to get started.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedAddresses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.listContent}
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[s.card, active && s.cardActive]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedId(item.id);
                      setSelectedAddress(item);
                    }}
                  >
                    <View style={s.iconWrap}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={active ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={s.details}>
                      <View style={s.labelRow}>
                        <View style={[s.badge, active && s.badgeActive]}>
                          <Text style={[s.badgeText, active && s.badgeTextActive]}>
                            {item.label}
                          </Text>
                        </View>
                        {active && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={colors.primary}
                          />
                        )}
                      </View>
                      <Text style={s.line1} numberOfLines={1}>
                        {item.line1}
                      </Text>
                      <Text style={s.city} numberOfLines={1}>
                        {item.city}
                        {item.postalCode ? ` ${item.postalCode}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity
              style={[s.confirmBtn, !selectedAddress && s.confirmBtnDisabled]}
              onPress={confirm}
              disabled={!selectedAddress}
              activeOpacity={0.85}
            >
              <Text style={s.confirmBtnText}>Confirm location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: SCREEN_H * 0.75,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: 10,
    gap: 12,
    backgroundColor: colors.white,
    ...shadow.sm,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.backgroundGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  badgeActive: {
    backgroundColor: `${colors.primary}22`,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badgeTextActive: {
    color: colors.primary,
  },
  line1: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  city: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
