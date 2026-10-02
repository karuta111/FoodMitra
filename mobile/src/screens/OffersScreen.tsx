import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/ui';
import { colors } from '../theme/colors';

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <Text style={s.title}>Offers</Text>
        <Text style={s.subtitle}>Deals & Discounts</Text>
      </View>

      {/* Empty state */}
      <View style={s.container}>
        <View style={s.iconWrap}>
          <Ionicons name="pricetag-outline" size={44} color={colors.primary} />
        </View>
        <Text style={s.emptyTitle}>No Offers Yet</Text>
        <Text style={s.emptySubtitle}>Check back soon for exciting deals and discounts.</Text>
      </View>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
    marginBottom: 60,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FDECEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
