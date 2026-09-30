import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api, ApiError } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, EmptyState } from '../components/ui';
import type { MenuCategory, Cart } from '../types';

export default function RestaurantScreen({ route, navigation }: any) {
  const { restaurantId, restaurantName } = route.params;
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ menuCategories: MenuCategory[] }>(`/restaurants/${restaurantId}/menu`)
      .then(m => setCategories(m.menuCategories || [])).catch(() => {}).finally(() => setLoading(false));
  }, [restaurantId]);

  const addItem = async (menuItemId: string) => {
    try { const c = await api.post<Cart>('/cart/items', { menuItemId, quantity: 1, replaceRestaurant: false }); setCart(c); }
    catch (e) { if (e instanceof ApiError && e.code === 'CART_RESTAURANT_MISMATCH') { const c = await api.post<Cart>('/cart/items', { menuItemId, quantity: 1, replaceRestaurant: true }); setCart(c); } }
  };

  return (
    <Screen>
      <Header title={restaurantName} onBack={() => navigation.goBack()} />
      <FlatList data={categories} keyExtractor={i => i.id} renderItem={({ item: cat }) => (
        <View style={s.cat}><Text style={s.catTitle}>{cat.name}</Text>
          {cat.items.map(item => (
            <View key={item.id} style={s.item}>
              <View style={{ flex: 1 }}><Text style={s.itemName}>{item.name}</Text>{item.description ? <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text> : null}<Text style={s.itemPrice}>₹{item.price}</Text></View>
              <TouchableOpacity disabled={item.availability !== 'AVAILABLE'} style={[s.addBtn, { opacity: item.availability !== 'AVAILABLE' ? 0.4 : 1 }]} onPress={() => addItem(item.id)}><Text style={s.addText}>ADD</Text></TouchableOpacity>
            </View>
          ))}
        </View>
      )} contentContainerStyle={s.list}
        ListEmptyComponent={loading ? <Text style={s.load}>Loading...</Text> : <EmptyState title="No menu items" />}
      />
      {cart && cart.items.length > 0 && (
        <TouchableOpacity style={s.cartBar} onPress={() => navigation.navigate('Cart')}><Text style={s.cartBarText}>{cart.items.length} items • ₹{cart.estimatedTotal}</Text><Text style={s.cartBarAction}>View Cart →</Text></TouchableOpacity>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 80 }, cat: { marginBottom: 16 }, catTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  itemName: { fontSize: 14, fontWeight: '500', color: colors.text }, itemDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 }, itemPrice: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 },
  addBtn: { backgroundColor: colors.primaryBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }, addText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  cartBar: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: colors.primary, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between' },
  cartBarText: { color: '#fff', fontSize: 14, fontWeight: '500' }, cartBarAction: { color: '#fff', fontSize: 12 }, load: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});
