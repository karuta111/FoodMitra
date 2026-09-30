import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../api/client';
import { useAuthStore } from '../store/auth';
import { colors } from '../theme/colors';
import { Screen, EmptyState } from '../components/ui';
import type { Restaurant } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api.get<{ items: Restaurant[]; total: number }>('/restaurants?page=1&pageSize=50'); setRestaurants(res.items); }
    catch (e) {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen>
      <View style={s.hero}><Text style={s.hello}>Hello, {user?.fullName || 'there'} 👋</Text><Text style={s.hTitle}>Hungry? Let's get you fed.</Text></View>
      <Text style={s.sectionTitle}>All Restaurants</Text>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Restaurant', { restaurantId: item.id, restaurantName: item.name })}>
            <View style={s.logo}><Text style={s.logoText}>{item.name.charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardCuisine}>{item.cuisine}</Text>
              {item.ratingCount > 0 && <Text style={s.meta}>★ {item.avgRating.toFixed(1)} ({item.ratingCount})</Text>}
              <Text style={[s.badge, { color: item.availability === 'OPEN' ? colors.success : colors.textMuted }]}>{item.availability.toLowerCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={loading ? <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>Loading...</Text> : <EmptyState title="No restaurants found" />}
      />
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Home')}><Ionicons name="home" size={22} color={colors.primary} /><Text style={s.navTextA}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('OrderHistory')}><Ionicons name="clipboard" size={22} color={colors.textMuted} /><Text style={s.navText}>Orders</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Cart')}><Ionicons name="cart" size={22} color={colors.textMuted} /><Text style={s.navText}>Cart</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={() => navigation.navigate('Profile')}><Ionicons name="person" size={22} color={colors.textMuted} /><Text style={s.navText}>Profile</Text></TouchableOpacity>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 24 },
  hello: { fontSize: 13, color: '#fff', opacity: 0.9 },
  hTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: '600', color: colors.primary },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardCuisine: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  meta: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  badge: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  bottomNav: { flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 8, paddingTop: 4 },
  navItem: { flex: 1, alignItems: 'center' },
  navText: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  navTextA: { fontSize: 10, color: colors.primary, fontWeight: '600', marginTop: 2 },
});
