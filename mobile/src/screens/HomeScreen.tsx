import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';
import { colors, radius, shadow } from '../theme/colors';
import { Screen } from '../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationPickerModal } from '../components/LocationPickerModal';
import type { Restaurant } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

// Banner aspect ratio: 1040 × 450
const BANNER_H = Math.round((SCREEN_W - 4) * (450 / 1040));

interface PromoBanner {
  id: string;
  imageUrl: string;
  title: string | null;
  displayOrder: number;
  isActive: boolean;
}

// ─── Banner carousel ──────────────────────────────────────────────────────────
function AnimatedDot({ isActive }: { isActive: boolean }) {
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isActive ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 14],
  });

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  return <Animated.View style={[bs.dot, { width, backgroundColor }]} />;
}

function BannerCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    api.get<PromoBanner[]>('/promo-banners').then(setBanners).catch(() => { });
  }, []);

  // ── Auto-scroll every 2.5 seconds ────────────────────────────────────────
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      const next = (activeRef.current + 1) % banners.length;
      activeRef.current = next;
      setActive(next);
      scrollRef.current?.scrollTo({ x: next * (SCREEN_W - 4), animated: true });
    }, 2500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 4));
    activeRef.current = idx;
    setActive(idx);
  };

  if (banners.length === 0) return null;

  return (
    <View style={bs.outer}>
      {/* Image box — overflow hidden for border radius */}
      <View style={bs.wrap}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={SCREEN_W - 4}
          decelerationRate="fast"
        >
          {banners.map((b) => (
            <View key={b.id} style={bs.slide}>
              <Image source={{ uri: b.imageUrl }} style={bs.img} resizeMode="cover" />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Dot indicators — outside the clipped box */}
      {banners.length > 1 && (
        <View style={bs.dots}>
          {banners.map((_, i) => (
            <AnimatedDot key={i} isActive={i === active} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Restaurant card (Zomato-style vertical) ─────────────────────────────────
function RestaurantCard({ item, onPress }: { item: Restaurant; onPress: () => void }) {
  const isOpen = item.availability === 'OPEN';
  const firstLetter = item.name.charAt(0).toUpperCase();
  const hasRating = item.avgRating > 0;

  return (
    <TouchableOpacity
      style={[cs.card, !isOpen && cs.cardClosed]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      {/* ── Cover image ── */}
      <View style={cs.imgWrap}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={cs.img} resizeMode="cover" />
        ) : (
          <View style={cs.imgFallback}>
            <Text style={cs.imgLetter}>{firstLetter}</Text>
          </View>
        )}

        {/* Closed overlay */}
        {!isOpen && (
          <View style={cs.closedOverlay}>
            <View style={cs.closedBadge}>
              <Text style={cs.closedBadgeText}>Closed</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Details ── */}
      <View style={cs.info}>
        {/* Name + Rating */}
        <View style={cs.nameRow}>
          <Text style={cs.name} numberOfLines={1}>{item.name}</Text>
          {/* {hasRating && (
            <View style={cs.ratingPill}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={cs.ratingText}>{item.avgRating.toFixed(1)}</Text>
            </View>
          )} */}
        </View>

        {/* Cuisine */}
        <Text style={cs.cuisine} numberOfLines={1}>{item.cuisine}</Text>

        {/* Divider */}
        {/* <View style={cs.divider} /> */}

        
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Location state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLat, setSelectedLat] = useState(18.52);
  const [selectedLng, setSelectedLng] = useState(73.85);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: Restaurant[]; total: number }>('/restaurants?page=1&pageSize=50');
      setRestaurants(res.items);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(search.toLowerCase()),
    )
    : restaurants;

  const ListHeader = (
    <>
      {/* Banner / Offers carousel */}
      <BannerCarousel />

      {/* Section header */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>All Restaurants</Text>
        <Text style={s.sectionCount}>{filtered.length} places</Text>
      </View>
    </>
  );

  return (
    <Screen>
      {/* ── Hero header ── */}
      <View style={[s.hero, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.hello}>Hello, {user?.fullName?.split(' ')[0] || 'there'} 👋</Text>
            <Text style={s.hTitle}>Hungry? Let's get you fed.</Text>
            <TouchableOpacity style={s.locationBtn} onPress={() => setShowLocationModal(true)}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={s.locationBtnText}>Deliver to: lat {selectedLat.toFixed(2)}, lng {selectedLng.toFixed(2)}</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar (floats below hero) ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search restaurants or dishes..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Restaurant list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard
            item={item}
            onPress={() => navigation.navigate('Restaurant', { restaurantId: item.id, restaurantName: item.name })}
          />
        )}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={s.loadingText}>Finding great restaurants…</Text>
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="storefront-outline" size={44} color={colors.primary} />
              </View>
              <Text style={s.emptyTitle}>No restaurants found</Text>
              <Text style={s.emptySubtitle}>Try adjusting your search</Text>
            </View>
          )
        }
      />



      <LocationPickerModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLat={selectedLat}
        currentLng={selectedLng}
        onSelect={(lat, lng) => {
          setSelectedLat(lat);
          setSelectedLng(lng);
          // In a real app, you'd likely fetch restaurants nearby based on lat/lng here
          // e.g., loadNearbyRestaurants(lat, lng);
        }}
      />
    </Screen>
  );
}

// ─── Banner styles ────────────────────────────────────────────────────────────
const bs = StyleSheet.create({
  outer: {
    marginTop: 14,
    marginHorizontal: 2,
  },
  wrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.md,
  },
  slide: {
    width: SCREEN_W - 4,
    height: BANNER_H,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 2,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  // active dot styles are handled via AnimatedDot inline styles
});

// ─── Card styles (Zomato vertical) ───────────────────────────────────────────
const CARD_IMG_H = Math.round((SCREEN_W - 32) * 0.52); // ~52% aspect ratio

const cs = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: 20,
    overflow: 'hidden',
    ...shadow.md,
  },
  cardClosed: {
    opacity: 0.7,
  },

  // ── Cover image ──
  imgWrap: {
    width: '100%',
    height: CARD_IMG_H,
    position: 'relative',
  },
  img: { width: '100%', height: '100%' },
  imgFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgLetter: { fontSize: 52, fontWeight: '800', color: colors.primary },

  // closed state
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedBadge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closedBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // offer badge at the bottom-left of the image
  offerBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.58)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  offerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Details ──
  info: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },

  // Zomato green rating pill
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1BA672',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  cuisine: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 10,
  },

  // bottom meta row  (time · distance · price)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textLight,
    marginHorizontal: 2,
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hello: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  hTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 30,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  locationBtnText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  searchWrap: {
    marginTop: -22,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...shadow.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionCount: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  loadingWrap: { alignItems: 'center', paddingTop: 60, gap: 14 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary },

});
