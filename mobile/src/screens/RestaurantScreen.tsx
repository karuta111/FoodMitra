import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Animated,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import type { MenuCategory, MenuItem, Cart, Restaurant } from '../types';

// ─── Menu Item Card ──────────────────────────────────────────────────────────
function MenuItemCard({
  item,
  cartQty,
  onAdd,
}: {
  item: MenuItem;
  cartQty: number;
  onAdd: () => void;
}) {
  const available = item.availability === 'AVAILABLE';
  const isVeg = item.isVeg;

  return (
    <View style={[mc.card, !available && { opacity: 0.5 }]}>
      {/* Left: text info */}
      <View style={mc.info}>
        {/* Veg / Non-veg indicator */}
        <View style={[mc.vegDot, { borderColor: isVeg ? colors.veg : colors.nonVeg }]}>
          <View style={[mc.vegDotInner, { backgroundColor: isVeg ? colors.veg : colors.nonVeg }]} />
        </View>

        <Text style={mc.name} numberOfLines={2}>{item.name}</Text>
        <Text style={mc.price}>₹{item.price}</Text>
        {item.description ? (
          <Text style={mc.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>

      {/* Right: image + ADD button */}
      <View style={mc.imgWrap}>
        {/* placeholder box — shown when no image */}
        <View style={mc.imgPlaceholder}>
          <Ionicons name="fast-food-outline" size={28} color="#D0D0D0" />
        </View>

        {/* ADD / qty control */}
        <TouchableOpacity
          style={[mc.addBtn, !available && mc.addBtnDisabled]}
          onPress={onAdd}
          disabled={!available}
          activeOpacity={0.8}
        >
          <Text style={mc.addText}>ADD</Text>
          {cartQty > 0 && (
            <View style={mc.qtyBubble}>
              <Text style={mc.qtyBubbleText}>{cartQty}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Category Header ─────────────────────────────────────────────────────────
function CategoryHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={ch.wrap}>
      <Text style={ch.title}>{title}</Text>
      <Text style={ch.count}>{count} items</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RestaurantScreen({ route, navigation }: any) {
  const { restaurantId, restaurantName } = route.params;
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get<{ menuCategories: MenuCategory[] }>(`/restaurants/${restaurantId}/menu`),
      api.get<Restaurant>(`/restaurants/${restaurantId}`).catch(() => null),
    ]).then(([menu, rest]) => {
      setCategories(menu.menuCategories || []);
      if (rest) setRestaurant(rest);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [restaurantId]);

  // ── Toggle search bar ──────────────────────────────────────────────────────
  const openSearch = useCallback(() => {
    setSearchVisible(true);
    Animated.timing(searchAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  const closeSearch = useCallback(() => {
    setSearchQuery('');
    Animated.timing(searchAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => {
      setSearchVisible(false);
    });
  }, []);

  // ── Filtered sections ──────────────────────────────────────────────────────
  const sections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        data: q
          ? cat.items.filter(
              (item) =>
                item.name.toLowerCase().includes(q) ||
                (item.description ?? '').toLowerCase().includes(q),
            )
          : cat.items,
      }))
      .filter((cat) => cat.data.length > 0);
  }, [categories, searchQuery]);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    (cart?.items ?? []).forEach((i) => {
      map[i.menuItemId] = (map[i.menuItemId] || 0) + i.quantity;
    });
    return map;
  }, [cart]);

  const addItem = async (menuItemId: string) => {
    try {
      const c = await api.post<Cart>('/cart/items', { menuItemId, quantity: 1, replaceRestaurant: false });
      setCart(c);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CART_RESTAURANT_MISMATCH') {
        const c = await api.post<Cart>('/cart/items', { menuItemId, quantity: 1, replaceRestaurant: true });
        setCart(c);
      }
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const displayName = restaurant?.name ?? restaurantName;
  const cuisine = restaurant?.cuisine ?? '';
  const rating = restaurant?.avgRating ?? 0;
  const ratingCount = restaurant?.ratingCount ?? 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top header ── */}
      <View style={s.header}>
        {/* Back */}
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Title (hidden when search open) */}
        {!searchVisible && (
          <Text style={s.headerTitle} numberOfLines={1}>{displayName}</Text>
        )}

        {/* Animated search bar */}
        {searchVisible && (
          <Animated.View style={[s.searchBar, { opacity: searchAnim, flex: 1 }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              ref={searchInputRef}
              style={s.searchInput}
              placeholder="Search menu..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Right buttons */}
        <View style={s.headerRight}>
          {!searchVisible ? (
            <TouchableOpacity style={s.iconBtn} onPress={openSearch} activeOpacity={0.7}>
              <Ionicons name="search" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.iconBtn} onPress={closeSearch} activeOpacity={0.7}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Restaurant info strip ── */}
      {!searchVisible && (
        <View style={s.infoStrip}>
          <View style={s.infoLeft}>
            <Text style={s.restName} numberOfLines={1}>{displayName}</Text>
            {cuisine ? <Text style={s.cuisineText}>{cuisine}</Text> : null}
            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={13} color={colors.textMuted} />
              <Text style={s.metaText}>20–35 mins</Text>
              <View style={s.metaDot} />
              <Ionicons name="bicycle-outline" size={14} color={colors.textMuted} />
              <Text style={s.metaText}>Free delivery</Text>
            </View>
          </View>
          {rating > 0 && (
            <View style={s.ratingBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
              {ratingCount > 0 && (
                <Text style={s.ratingCount}>  {ratingCount > 1000 ? `${(ratingCount / 1000).toFixed(1)}k` : ratingCount}+</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── Divider ── */}
      <View style={s.stripDivider} />

      {/* ── Menu list ── */}
      {loading ? (
        <View style={s.loadWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadText}>Loading menu…</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="search-outline" size={44} color={colors.textLight} />
          <Text style={s.emptyTitle}>{searchQuery ? 'No items found' : 'No menu available'}</Text>
          <Text style={s.emptySubtitle}>{searchQuery ? `No results for "${searchQuery}"` : 'This restaurant has no menu yet'}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={true}
          renderSectionHeader={({ section }) => (
            <CategoryHeader title={section.name} count={section.data.length} />
          )}
          renderItem={({ item }) => (
            <MenuItemCard
              item={item}
              cartQty={cartQtyMap[item.id] ?? 0}
              onAdd={() => addItem(item.id)}
            />
          )}
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: cart && cart.items.length > 0 ? 100 : 24 },
          ]}
          ItemSeparatorComponent={() => <View style={s.itemSep} />}
          SectionSeparatorComponent={() => <View style={s.sectionSep} />}
        />
      )}

      {/* ── Floating cart bar ── */}
      {cart && cart.items.length > 0 && (
        <TouchableOpacity
          style={[s.cartBar, { bottom: insets.bottom + 12 }]}
          onPress={() => navigation.navigate('CartTab')}
          activeOpacity={0.92}
        >
          <View style={s.cartLeft}>
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeText}>{cart.items.reduce((a, i) => a + i.quantity, 0)}</Text>
            </View>
            <Text style={s.cartItemsText}>
              {cart.items.reduce((a, i) => a + i.quantity, 0)} item{cart.items.reduce((a, i) => a + i.quantity, 0) !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={s.cartTotal}>₹{cart.estimatedTotal}</Text>
          <View style={s.cartRight}>
            <Text style={s.cartAction}>View Cart</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Menu item card styles ────────────────────────────────────────────────────
const mc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  info: {
    flex: 1,
    paddingRight: 12,
  },
  vegDot: {
    width: 14,
    height: 14,
    borderRadius: 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  vegDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  desc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  imgWrap: {
    width: 100,
    alignItems: 'center',
  },
  imgPlaceholder: {
    width: 96,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  addBtn: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 20,
    paddingVertical: 6,
    ...shadow.sm,
  },
  addBtnDisabled: {
    borderColor: colors.textLight,
  },
  addText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qtyBubble: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBubbleText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
});

// ─── Category header styles ───────────────────────────────────────────────────
const ch = StyleSheet.create({
  wrap: {
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.1,
  },
  count: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 54,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    ...shadow.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginHorizontal: 8,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  cancelText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    paddingHorizontal: 6,
  },

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#fff',
  },
  infoLeft: {
    flex: 1,
    paddingRight: 12,
  },
  restName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  cuisineText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textLight,
    marginHorizontal: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#48C479',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
    alignSelf: 'flex-start',
  },
  ratingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  ratingCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '500',
  },
  stripDivider: {
    height: 6,
    backgroundColor: '#F4F4F4',
  },

  // List
  listContent: {
    paddingTop: 4,
  },
  itemSep: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
  },
  sectionSep: {
    height: 0,
  },

  // Loading / empty
  loadWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
    marginBottom: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Cart bar
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow.lg,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cartItemsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cartTotal: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  cartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartAction: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
