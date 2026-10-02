import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui';
import { colors } from '../theme/colors';

export default function OffersScreen() {
  return (
    <Screen grey>
      <View style={s.container}>
        <Ionicons name="pricetag-outline" size={64} color={colors.textLight} />
        <Text style={s.title}>No Offers Yet</Text>
        <Text style={s.subtitle}>Check back soon for exciting deals and discounts.</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
