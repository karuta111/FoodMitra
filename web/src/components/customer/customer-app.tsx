'use client';

import { useEffect, useState } from 'react';
import {
 Home, ShoppingCart, ClipboardList, User, MapPin, Search, Star,
 Plus, Minus, Trash2, ChevronRight, ArrowLeft, CheckCircle, Clock,
 Bell, Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
 Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api-client';
import { toastApiError } from '@/lib/toast-errors';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { MapPicker } from '@/components/shared/map-picker';
import { LocationPickerModal } from '@/components/shared/location-picker-modal';
import { BrandLogo } from '@/components/shared/brand-logo';
import { PromoCarousel } from '@/components/shared/promo-carousel';

type Screen = 'home' | 'restaurant' | 'cart' | 'checkout' | 'tracking' | 'orders' | 'profile' | 'addresses' | 'notifications';

interface RestaurantListItem {
 id: string;
 name: string;
 logoUrl: string | null;
 cuisine: string;
 avgRating: number;
 ratingCount: number;
 deliveryFee: number;
 prepTimeMinutes: number;
 availability: string;
 distanceKm: number | null;
 address?: string;
}

interface MenuItemType {
 id: string;
 name: string;
 description: string | null;
 price: number;
 imageUrl: string | null;
 isVeg: boolean;
 availability: string;
 prepTimeMinutes: number;
}

interface MenuCategory {
 id: string;
 name: string;
 items: MenuItemType[];
}

interface CartItem {
 id: string;
 menuItemId: string;
 name: string;
 price: number;
 quantity: number;
 subtotal: number;
 isVeg: boolean;
 imageUrl: string | null;
}

interface Cart {
 id: string;
 restaurant: { id: string; name: string };
 items: CartItem[];
 subtotal: number;
 estimatedDeliveryFee: number;
 deliveryFeeSource?: 'tier' | 'restaurant_default' | 'platform_default';
 deliveryDistanceKm?: number | null;
 estimatedTotal: number;
 minOrderAmount: number;
 meetsMinimum: boolean;
}

interface Address {
 id: string;
 label: string;
 line1: string;
 line2: string | null;
 city: string;
 postalCode: string | null;
 latitude: number;
 longitude: number;
}

interface OrderListItem {
 id: string;
 shortCode: string;
 orderStatus: string;
 paymentStatus: string;
 totalAmount: number;
 createdAt: string;
 restaurant: { id: string; name: string; logoUrl: string | null };
}

const BOTTOM_NAV = [
 { id: 'home', label: 'Home', icon: Home },
 { id: 'orders', label: 'Orders', icon: ClipboardList },
 { id: 'cart', label: 'Cart', icon: ShoppingCart },
 { id: 'profile', label: 'Profile', icon: User },
] as const;

export function CustomerApp() {
 const [screen, setScreen] = useState<Screen>('home');
 const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
 const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
 const [cartBadge, setCartBadge] = useState(0);

 // Refresh cart badge
 useEffect(() => {
 if (screen === 'cart' || screen === 'home') {
 api.get<Cart | null>('/api/v1/cart').then((c) => setCartBadge(c?.items.length || 0)).catch(() => setCartBadge(0));
 }
 }, [screen]);

 return (
 <div className="min-h-screen bg-slate-50 flex flex-col">
 {/* Mobile header (visible on small screens) */}
 <header className="lg:hidden bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
 <div className="flex items-center gap-2">
 {screen !== 'home' ? (
 <button onClick={() => setScreen('home')} className="p-1 -ml-1 rounded hover:bg-slate-100 ">
 <ArrowLeft className="w-4 h-4 text-slate-600 " />
 </button>
 ) : (
 <div className="lg:hidden"><BrandLogo size="sm" showLabel={true} /></div>
 )}
 {screen !== 'home' && (
 <span className="font-semibold text-slate-800 text-sm">
 {screen === 'restaurant' && 'Menu'}
 {screen === 'cart' && 'Your Cart'}
 {screen === 'checkout' && 'Checkout'}
 {screen === 'tracking' && 'Order Tracking'}
 {screen === 'orders' && 'Your Orders'}
 {screen === 'profile' && 'Profile'}
 {screen === 'addresses' && 'Saved Addresses'}
 {screen === 'notifications' && 'Notifications'}
 </span>
 )}
 </div>
 <div className="flex items-center gap-1">
 <button onClick={() => setScreen('notifications')} className="p-2 rounded hover:bg-slate-100 relative">
 <Bell className="w-4 h-4 text-slate-600 " />
 </button>
 </div>
 </header>

 {/* Desktop top nav (visible on large screens) */}
 <header className="hidden lg:flex bg-white border-b border-slate-200 px-6 h-16 items-center justify-between sticky top-0 z-30 shadow-sm">
 <div className="flex items-center gap-8">
 <BrandLogo size="sm" />
 <nav className="flex items-center gap-1">
 {BOTTOM_NAV.map((item) => {
 const Icon = item.icon;
 const active = screen === item.id || (item.id === 'home' && screen === 'restaurant');
 return (
 <button
 key={item.id}
 onClick={() => setScreen(item.id as Screen)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors relative ${
 active ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
 }`}
 >
 <Icon className="w-4 h-4" />
 <span>{item.label}</span>
 {item.id === 'cart' && cartBadge > 0 && (
 <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-[9px] min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-1">
 {cartBadge}
 </span>
 )}
 </button>
 );
 })}
 </nav>
 </div>
 <div className="flex items-center gap-1">
 <button onClick={() => setScreen('notifications')} className="p-2 rounded hover:bg-slate-100 relative">
 <Bell className="w-5 h-5 text-slate-600 " />
 </button>
 </div>
 </header>

 {/* Screen content */}
 <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
 <div className="max-w-2xl lg:max-w-5xl mx-auto w-full">
 {screen === 'home' && <CustomerHome onOpenRestaurant={(id) => { setSelectedRestaurantId(id); setScreen('restaurant'); }} />}
 {screen === 'restaurant' && selectedRestaurantId && (
 <CustomerRestaurant restaurantId={selectedRestaurantId} onGoToCart={() => setScreen('cart')} />
 )}
 {screen === 'cart' && <CustomerCart onCheckout={() => setScreen('checkout')} onEmpty={() => setScreen('home')} />}
 {screen === 'checkout' && (
 <CustomerCheckout
 onSuccess={(orderId) => { setSelectedOrderId(orderId); setScreen('tracking'); }}
 onBack={() => setScreen('cart')}
 />
 )}
 {screen === 'tracking' && selectedOrderId && <CustomerOrderTracking orderId={selectedOrderId} />}
 {screen === 'orders' && (
 <CustomerOrders onOpenOrder={(id) => { setSelectedOrderId(id); setScreen('tracking'); }} />
 )}
 {screen === 'profile' && <CustomerProfile onNavigate={setScreen} />}
 {screen === 'addresses' && <CustomerAddresses />}
 {screen === 'notifications' && <CustomerNotifications />}
 </div>
 </main>

 {/* Bottom nav — mobile only */}
 <nav className="lg:hidden border-t border-slate-200 bg-white px-2 py-1 flex items-center justify-around fixed bottom-0 left-0 right-0 z-30">
 {BOTTOM_NAV.map((item) => {
 const Icon = item.icon;
 const active = screen === item.id || (item.id === 'home' && screen === 'restaurant');
 return (
 <button
 key={item.id}
 onClick={() => setScreen(item.id as Screen)}
 className={cn(
 'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-[10px] relative',
 active ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700 ',
 )}
 >
 <Icon className="w-5 h-5" />
 <span>{item.label}</span>
 {item.id === 'cart' && cartBadge > 0 && (
 <span className="absolute -top-0.5 right-1.5 bg-orange-500 text-white text-[9px] min-w-[14px] h-[14px] flex items-center justify-center rounded-full px-0.5">
 {cartBadge}
 </span>
 )}
 </button>
 );
 })}
 </nav>
 </div>
 );
}

function CustomerHome({ onOpenRestaurant }: { onOpenRestaurant: (id: string) => void }) {
 const { user } = useAuth();
 const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [q, setQ] = useState('');
 const [lat, setLat] = useState(18.52);
 const [lng, setLng] = useState(73.85);
 const [locationPickerOpen, setLocationPickerOpen] = useState(false);

 useEffect(() => {
 // Try to get user's location on first load
 if (navigator.geolocation) {
 navigator.geolocation.getCurrentPosition(
 (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
 () => { /* keep defaults */ },
 { timeout: 3000 },
 );
 }
 }, []);

 useEffect(() => {
 setLoading(true);
 const params = new URLSearchParams({ page: '1', pageSize: '20', lat: lat.toString(), lng: lng.toString(), radiusKm: '10' });
 if (q) params.set('q', q);
 api.get<{ items: RestaurantListItem[]; total: number }>(`/api/v1/restaurants?${params}`)
 .then((r) => setRestaurants(r.items))
 .catch((e) => toastApiError(e, 'Failed to load restaurants'))
 .finally(() => setLoading(false));
 }, [q, lat, lng]);

 return (
 <div className="space-y-4 p-4 lg:p-6">
 <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-4 lg:p-6 shadow-sm">
 <p className="text-xs opacity-90">Hello, {user?.fullName || 'there'} 👋</p>
 <p className="text-lg lg:text-2xl font-semibold mt-0.5">Hungry? Let's get you fed.</p>
 <button
 onClick={() => setLocationPickerOpen(true)}
 className="mt-2 flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 rounded-md px-2 py-1 transition-colors"
 >
 <MapPin className="w-3 h-3" />
 <span>Deliver to: lat {lat.toFixed(2)}, lng {lng.toFixed(2)}</span>
 <ChevronRight className="w-3 h-3" />
 </button>
 </div>

 <LocationPickerModal
 open={locationPickerOpen}
 onOpenChange={setLocationPickerOpen}
 currentLat={lat}
 currentLng={lng}
 onSelect={(newLat, newLng) => {
 setLat(newLat);
 setLng(newLng);
 toast.success('Delivery location updated');
 }}
 />

 <PromoCarousel />

 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input placeholder="Search restaurants…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
 </div>

 <div>
 <h2 className="text-sm lg:text-base font-semibold text-slate-700 mb-2">Nearby restaurants</h2>
 {loading ? (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
 ))}
 </div>
 ) : restaurants.length === 0 ? (
 <div className="text-center py-12 text-sm text-slate-500">
 <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
 No restaurants available in your area.
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
 {restaurants.map((r) => (
 <button
 key={r.id}
 onClick={() => onOpenRestaurant(r.id)}
 className="w-full bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3 hover:border-orange-300 hover:shadow-sm transition-all text-left"
 >
 <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500 text-lg font-semibold shrink-0">
 {r.name.charAt(0)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2">
 <p className="font-medium text-slate-800 text-sm truncate">{r.name}</p>
 {r.distanceKm !== null && (
 <span className="text-[10px] text-slate-500 shrink-0">{r.distanceKm.toFixed(1)} km</span>
 )}
 </div>
 <p className="text-xs text-slate-500">{r.cuisine}</p>
 <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
 {r.ratingCount > 0 && (
 <span className="flex items-center gap-0.5">
 <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
 {r.avgRating.toFixed(1)} ({r.ratingCount})
 </span>
 )}
 <span className="flex items-center gap-0.5">
 <Clock className="w-3 h-3" />
 {r.prepTimeMinutes} min
 </span>
 <span>₹{r.deliveryFee} fee</span>
 </div>
 <div className="mt-1.5">
 <Badge variant="secondary" className={
 r.availability === 'OPEN' ? 'text-green-700 bg-green-50 text-[10px]' : 'text-slate-700 bg-slate-100 text-[10px]'
 }>{r.availability.replace(/_/g, ' ').toLowerCase()}</Badge>
 </div>
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}

function CustomerRestaurant({ restaurantId, onGoToCart }: { restaurantId: string; onGoToCart: () => void }) {
 const [menu, setMenu] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [cart, setCart] = useState<Cart | null>(null);

 const loadCart = () => api.get<Cart | null>('/api/v1/cart').then(setCart).catch(() => null);

 useEffect(() => {
 api.get<any>(`/api/v1/restaurants/${restaurantId}/menu`)
 .then((m) => { setMenu(m); loadCart(); })
 .finally(() => setLoading(false));
 }, [restaurantId]);

 const addItem = async (item: MenuItemType) => {
 try {
 const cart = await api.post<Cart>('/api/v1/cart/items', { menuItemId: item.id, quantity: 1, replaceRestaurant: false });
 setCart(cart);
 toast.success(`${item.name} added to cart`);
 } catch (e) {
 if (e instanceof ApiError && e.code === 'CART_RESTAURANT_MISMATCH') {
 if (confirm('Your cart contains items from another restaurant. Clear it and add this item?')) {
 const cart = await api.post<Cart>('/api/v1/cart/items', { menuItemId: item.id, quantity: 1, replaceRestaurant: true });
 setCart(cart);
 toast.success('Cart replaced with new item');
 }
 } else {
 toastApiError(e, 'Failed to add item');
 }
 }
 };

 if (loading) return <div className="p-4 text-sm text-slate-500">Loading menu…</div>;
 if (!menu) return <div className="p-4 text-sm text-slate-500">Restaurant not found.</div>;

 return (
 <div className="pb-20 lg:pb-8">
 {/* Hero */}
 <div className="bg-gradient-to-br from-orange-400 to-amber-500 p-4 lg:p-8 text-white">
 <div className="max-w-4xl mx-auto">
 <h1 className="text-xl lg:text-3xl font-semibold">{menu.name}</h1>
 <p className="text-xs lg:text-sm opacity-90 mt-0.5">{menu.cuisine}</p>
 <div className="flex items-center gap-3 text-xs lg:text-sm mt-2 opacity-90">
 {menu.ratingCount > 0 && (
 <span className="flex items-center gap-0.5">
 <Star className="w-3 h-3 fill-white text-white" />
 {menu.avgRating.toFixed(1)} ({menu.ratingCount})
 </span>
 )}
 <span className="flex items-center gap-0.5">
 <Clock className="w-3 h-3" />
 {menu.openingTime} - {menu.closingTime}
 </span>
 </div>
 {menu.address && <p className="text-xs lg:text-sm opacity-90 mt-2">{menu.address.line1}, {menu.address.city}</p>}
 </div>
 </div>

 {/* Menu */}
 <div className="p-4 lg:p-6 space-y-4 lg:max-w-5xl lg:mx-auto">
 {menu.menuCategories.map((cat: MenuCategory) => (
 <div key={cat.id}>
 <h2 className="text-sm lg:text-lg font-semibold text-slate-700 mb-2">{cat.name}</h2>
 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
 {cat.items.map((item) => {
 const inCart = cart?.items.find((ci) => ci.menuItemId === item.id);
 const unavailable = item.availability !== 'AVAILABLE';
 return (
 <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className={unavailable ? 'w-3 h-3 border-2 border-slate-300 rounded-sm' : item.isVeg ? 'w-3 h-3 border-2 border-green-500 rounded-sm flex items-center justify-center' : 'w-3 h-3 border-2 border-red-500 rounded-sm flex items-center justify-center'}>
 {item.isVeg ? <span className={unavailable ? 'w-1.5 h-1.5 bg-slate-300' : 'w-1.5 h-1.5 bg-green-500 rounded-full'} /> : <span className={unavailable ? 'w-1.5 h-1.5 bg-slate-300' : 'w-1.5 h-1.5 bg-red-500 rounded-full'} />}
 </span>
 <p className={`text-sm font-medium ${unavailable ? 'text-slate-400' : 'text-slate-800'}`}>{item.name}</p>
 </div>
 {item.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
 <p className="text-sm font-medium text-slate-700 mt-1">₹{item.price}</p>
 {unavailable && <p className="text-[10px] text-red-500 mt-1">Currently unavailable</p>}
 </div>
 <div className="shrink-0">
 {inCart ? (
 <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-1 py-1">
 <button
 className="w-6 h-6 flex items-center justify-center text-orange-600 hover:bg-orange-100 rounded"
 onClick={async () => {
 if (inCart.quantity > 1) {
 const updated = await api.patch<Cart>(`/api/v1/cart/items/${inCart.id}`, { quantity: inCart.quantity - 1 });
 setCart(updated);
 } else {
 await api.delete(`/api/v1/cart/items/${inCart.id}`);
 loadCart();
 }
 }}
 >
 <Minus className="w-3 h-3" />
 </button>
 <span className="text-xs font-medium text-orange-700 min-w-[1ch] text-center">{inCart.quantity}</span>
 <button
 className="w-6 h-6 flex items-center justify-center text-orange-600 hover:bg-orange-100 rounded"
 onClick={async () => {
 const updated = await api.patch<Cart>(`/api/v1/cart/items/${inCart.id}`, { quantity: inCart.quantity + 1 });
 setCart(updated);
 }}
 >
 <Plus className="w-3 h-3" />
 </button>
 </div>
 ) : (
 <Button
 size="sm"
 variant="outline"
 disabled={unavailable}
 className="border-orange-300 text-orange-600 hover:bg-orange-50 h-8"
 onClick={() => addItem(item)}
 >
 <Plus className="w-3 h-3 mr-0.5" /> ADD
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>

 {/* Sticky cart bar */}
 {cart && cart.items.length > 0 && (
 <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 px-3 z-30 lg:max-w-4xl lg:mx-auto">
 <button
 onClick={onGoToCart}
 className="w-full bg-orange-500 text-white rounded-xl p-3 flex items-center justify-between shadow-lg shadow-orange-200"
 >
 <span className="text-sm font-medium">{cart.items.length} item{cart.items.length > 1 ? 's' : ''} • ₹{cart.estimatedTotal}</span>
 <span className="text-xs flex items-center gap-1">View cart <ChevronRight className="w-3 h-3" /></span>
 </button>
 </div>
 )}
 </div>
 );
}

function CustomerCart({ onCheckout, onEmpty }: { onCheckout: () => void; onEmpty: () => void }) {
 const [cart, setCart] = useState<Cart | null>(null);
 const [loading, setLoading] = useState(true);

 const load = () => {
 setLoading(true);
 api.get<Cart | null>('/api/v1/cart')
 .then(setCart)
 .finally(() => setLoading(false));
 };

 useEffect(() => { load(); }, []);

 const updateQty = async (itemId: string, qty: number) => {
 try {
 const updated = await api.patch<Cart>(`/api/v1/cart/items/${itemId}`, { quantity: qty });
 setCart(updated);
 } catch (e) { toastApiError(e, 'Failed to update'); }
 };

 const removeItem = async (itemId: string) => {
 try {
 const updated = await api.delete<Cart | null>(`/api/v1/cart/items/${itemId}`);
 setCart(updated);
 if (!updated) onEmpty();
 } catch (e) { toastApiError(e, 'Failed to remove'); }
 };

 const clear = async () => {
 if (!confirm('Clear entire cart?')) return;
 await api.delete('/api/v1/cart');
 setCart(null);
 onEmpty();
 };

 if (loading) return <div className="p-4 text-sm text-slate-500">Loading cart…</div>;

 if (!cart || cart.items.length === 0) {
 return (
 <div className="p-4 text-center py-16">
 <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-3" />
 <p className="text-sm font-medium text-slate-700">Your cart is empty</p>
 <p className="text-xs text-slate-500 mt-1">Browse restaurants to add items.</p>
 <Button className="mt-4 bg-orange-500 hover:bg-orange-600" onClick={onEmpty}>Browse restaurants</Button>
 </div>
 );
 }

 return (
 <div className="p-4 space-y-3">
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
 Order from <strong>{cart.restaurant.name}</strong>
 </div>

 {cart.items.map((it) => (
 <div key={it.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start gap-3">
 <div className="flex-1">
 <p className="text-sm font-medium text-slate-800">{it.name}</p>
 <p className="text-xs text-slate-500">₹{it.price}</p>
 </div>
 <div className="flex items-center gap-2 bg-slate-50 border rounded px-1 py-0.5">
 <button onClick={() => updateQty(it.id, it.quantity - 1)} className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded">
 <Minus className="w-3 h-3" />
 </button>
 <span className="text-xs min-w-[1ch] text-center">{it.quantity}</span>
 <button onClick={() => updateQty(it.id, it.quantity + 1)} className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded">
 <Plus className="w-3 h-3" />
 </button>
 </div>
 <span className="text-sm font-medium text-slate-700 w-16 text-right">₹{it.subtotal}</span>
 <button onClick={() => removeItem(it.id)} className="text-red-500 hover:text-red-700 p-1">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}

 <button onClick={clear} className="text-xs text-red-500 hover:underline">Clear cart</button>

 <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
 <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{cart.subtotal}</span></div>
 <div className="flex justify-between text-slate-600">
 <span>Delivery fee {cart.deliveryDistanceKm != null && <span className="text-slate-400">({cart.deliveryDistanceKm} km)</span>}</span>
 <span>₹{cart.estimatedDeliveryFee}</span>
 </div>
 <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-slate-800"><span>Total</span><span>₹{cart.estimatedTotal}</span></div>
 </div>

 {!cart.meetsMinimum && (
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
 Minimum order amount is ₹{cart.minOrderAmount}. Add ₹{(cart.minOrderAmount - cart.subtotal).toFixed(2)} more.
 </div>
 )}

 <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled={!cart.meetsMinimum} onClick={onCheckout}>
 Proceed to checkout • ₹{cart.estimatedTotal}
 </Button>
 </div>
 );
}

function CustomerCheckout({ onSuccess, onBack }: { onSuccess: (orderId: string) => void; onBack: () => void }) {
 const [addresses, setAddresses] = useState<Address[]>([]);
 const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
 const [notes, setNotes] = useState('');
 const [loading, setLoading] = useState(true);
 const [placing, setPlacing] = useState(false);
 const [showAddAddr, setShowAddAddr] = useState(false);
 const [checkoutCart, setCheckoutCart] = useState<Cart | null>(null);
 const [cartLoading, setCartLoading] = useState(false);

 useEffect(() => {
 api.get<Address[]>('/api/v1/customers/addresses')
 .then((r) => {
 setAddresses(r);
 if (r.length > 0) setSelectedAddressId(r[0].id);
 })
 .finally(() => setLoading(false));
 }, []);

 // Whenever the selected address changes, refetch the cart WITH the address
 // so the delivery fee reflects the distance-based tier.
 useEffect(() => {
 if (!selectedAddressId) {
 setCheckoutCart(null);
 return;
 }
 setCartLoading(true);
 api.get<Cart | null>(`/api/v1/cart?deliveryAddressId=${encodeURIComponent(selectedAddressId)}`)
 .then(setCheckoutCart)
 .catch(() => setCheckoutCart(null))
 .finally(() => setCartLoading(false));
 }, [selectedAddressId]);

 const placeOrder = async () => {
 if (!selectedAddressId) {
 toast.error('Please select a delivery address');
 return;
 }
 setPlacing(true);
 try {
 const result = await api.post<{ order: { id: string } }>(
 '/api/v1/orders',
 { deliveryAddressId: selectedAddressId, notes },
 );
 toast.success('Order placed! Awaiting payment confirmation.');
 onSuccess(result.order.id);
 } catch (e) {
 toastApiError(e, 'Failed to place order');
 } finally {
 setPlacing(false);
 }
 };

 if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

 return (
 <div className="p-4 space-y-4">
 <h2 className="text-sm font-semibold text-slate-700">Delivery Address</h2>
 {addresses.length === 0 ? (
 <div className="text-center py-8 bg-slate-50 rounded-lg">
 <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
 <p className="text-sm text-slate-600">No saved addresses yet.</p>
 <Button size="sm" className="mt-3 bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddAddr(true)}>Add address</Button>
 </div>
 ) : (
 <div className="space-y-2">
 {addresses.map((a) => (
 <label key={a.id} className={cn('block bg-white border rounded-lg p-3 cursor-pointer', selectedAddressId === a.id ? 'border-orange-400 bg-orange-50' : 'border-slate-200')}>
 <div className="flex items-start gap-2">
 <input type="radio" checked={selectedAddressId === a.id} onChange={() => setSelectedAddressId(a.id)} className="mt-1" />
 <div>
 <p className="text-sm font-medium text-slate-800">{a.label}</p>
 <p className="text-xs text-slate-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.postalCode}</p>
 </div>
 </div>
 </label>
 ))}
 <Button size="sm" variant="outline" onClick={() => setShowAddAddr(true)} className="w-full">+ Add new address</Button>
 </div>
 )}

 <div className="space-y-1.5">
 <Label htmlFor="notes">Order notes (optional)</Label>
 <Textarea id="notes" placeholder="e.g. Ring the bell twice" value={notes} onChange={(e) => setNotes(e.target.value)} />
 </div>

 {/* Distance-based delivery fee breakdown — updated whenever the selected address changes */}
 {checkoutCart && (
 <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 text-sm">
 <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{checkoutCart.subtotal}</span></div>
 <div className="flex justify-between text-slate-600">
 <span>
 Delivery fee
 {checkoutCart.deliveryDistanceKm != null && (
 <span className="text-slate-400 ml-1">({checkoutCart.deliveryDistanceKm} km)</span>
 )}
 </span>
 <span>₹{checkoutCart.estimatedDeliveryFee}</span>
 </div>
 {checkoutCart.deliveryFeeSource === 'tier' && (
 <div className="text-[10px] text-slate-400 leading-tight">Distance-based fee (admin-configured tier)</div>
 )}
 <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-slate-800"><span>Total</span><span>₹{checkoutCart.estimatedTotal}</span></div>
 {cartLoading && <div className="text-[10px] text-slate-400">Updating fee…</div>}
 </div>
 )}

 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
 <strong>Manual payment:</strong> Place your order and the restaurant admin will confirm payment manually.
 </div>

 <div className="flex gap-2">
 <Button variant="outline" onClick={onBack}>Back to cart</Button>
 <Button className="flex-1 bg-orange-500 hover:bg-orange-600" disabled={placing || !selectedAddressId} onClick={placeOrder}>
 {placing ? 'Placing order…' : 'Place order'}
 </Button>
 </div>

 <Dialog open={showAddAddr} onOpenChange={setShowAddAddr}>
 <DialogContent>
 <DialogHeader><DialogTitle>Add new address</DialogTitle></DialogHeader>
 <AddressForm
 onSaved={() => {
 setShowAddAddr(false);
 api.get<Address[]>('/api/v1/customers/addresses').then((r) => {
 setAddresses(r);
 if (r.length > 0 && !selectedAddressId) setSelectedAddressId(r[0].id);
 });
 }}
 />
 </DialogContent>
 </Dialog>
 </div>
 );
}

function AddressForm({ onSaved }: { onSaved: () => void }) {
 const [label, setLabel] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
 const [line1, setLine1] = useState('');
 const [line2, setLine2] = useState('');
 const [city, setCity] = useState('Pune');
 const [state, setState] = useState('Maharashtra');
 const [postalCode, setPostalCode] = useState('');
 const [latitude, setLatitude] = useState(18.52);
 const [longitude, setLongitude] = useState(73.85);
 const [saving, setSaving] = useState(false);

 const save = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 try {
 await api.post('/api/v1/customers/addresses', {
 label, line1, line2, city, state, postalCode, latitude, longitude,
 });
 toast.success('Address saved');
 onSaved();
 } catch (e) {
 toastApiError(e, 'Failed to save address');
 } finally { setSaving(false); }
 };

 return (
 <form onSubmit={save} className="space-y-3">
 <div className="grid grid-cols-3 gap-2">
 {(['HOME', 'WORK', 'OTHER'] as const).map((l) => (
 <button key={l} type="button" className={cn('px-2 py-1.5 text-xs rounded border', label === l ? 'bg-orange-50 border-orange-400 text-orange-700' : 'border-slate-200')} onClick={() => setLabel(l)}>
 {l}
 </button>
 ))}
 </div>

 {/* Map picker — drop a pin to set location */}
 <div className="space-y-1.5">
 <Label>Pin your location on the map</Label>
 <MapPicker
 latitude={latitude}
 longitude={longitude}
 onChange={(lat, lng) => {
 setLatitude(lat);
 setLongitude(lng);
 }}
 height="250px"
 />
 </div>

 <div className="space-y-1.5"><Label>Address line 1</Label><Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Flat 101, Building A" required /></div>
 <div className="space-y-1.5"><Label>Address line 2</Label><Input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Landmark / area" /></div>
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1.5"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} required /></div>
 <div className="space-y-1.5"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} /></div>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1.5"><Label>Pincode</Label><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="411001" /></div>
 <div className="space-y-1.5">
 <Label>Coordinates</Label>
 <div className="text-xs text-slate-500 px-3 py-2 bg-slate-50 rounded border border-slate-200">
 {latitude.toFixed(4)}, {longitude.toFixed(4)}
 </div>
 </div>
 </div>
 <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={saving}>{saving ? 'Saving…' : 'Save address'}</Button>
 </form>
 );
}

function CustomerOrderTracking({ orderId }: { orderId: string }) {
 const [tracking, setTracking] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const load = () => api.get<any>(`/api/v1/orders/${orderId}/tracking`).then(setTracking).finally(() => setLoading(false));
 load();
 const t = setInterval(load, 5000);
 return () => clearInterval(t);
 }, [orderId]);

 if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;
 if (!tracking) return <div className="p-4 text-sm text-slate-500">Order not found.</div>;

 const STEPS = ['PLACED', 'APPROVED', 'PAID', 'DELIVERED'];
 const currentIdx = STEPS.indexOf(tracking.currentStatus);
 const isCancelled = tracking.currentStatus === 'CANCELLED';

 return (
 <div className="p-4 space-y-4">
 <div className="bg-white border border-slate-200 rounded-xl p-4">
 <div className="flex items-center justify-between mb-1">
 <span className="font-mono text-xs text-slate-500">#{tracking.shortCode}</span>
 <Badge variant="secondary" className="text-[10px]">{tracking.currentStatus.replace(/_/g, ' ')}</Badge>
 </div>
 <p className="text-lg font-semibold text-slate-800">{tracking.restaurant.name}</p>
 <p className="text-sm text-slate-600 mt-2">Total: <strong>₹{tracking.total}</strong></p>
 </div>

 {isCancelled ? (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
 This order was {tracking.currentStatus.replace(/_/g, ' ').toLowerCase()}.
 </div>
 ) : (
 <div className="bg-white border border-slate-200 rounded-xl p-4">
 <h3 className="text-sm font-semibold text-slate-700 mb-3">Order status</h3>
 <div className="space-y-3">
 {STEPS.map((step, idx) => {
 const done = idx <= currentIdx;
 const isCurrent = idx === currentIdx;
 return (
 <div key={step} className="flex items-center gap-3">
 <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px]', done ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400')}>
 {done ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
 </div>
 <div className="flex-1">
 <p className={cn('text-sm', done ? 'text-slate-800 font-medium' : 'text-slate-500')}>{step.replace(/_/g, ' ').toLowerCase()}</p>
 {isCurrent && <p className="text-[10px] text-orange-600 mt-0.5">In progress…</p>}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {tracking.rider && (
 <div className="bg-white border border-slate-200 rounded-xl p-3">
 <p className="text-xs text-slate-500 mb-1">Your rider</p>
 <p className="text-sm font-medium text-slate-800">{tracking.rider.name}</p>
 <p className="text-xs text-slate-600">{tracking.rider.phone}</p>
 </div>
 )}

 <div className="bg-white border border-slate-200 rounded-xl p-3">
 <p className="text-xs text-slate-500 mb-2">Order items</p>
 {tracking.items.map((it: any, idx: number) => (
 <div key={idx} className="text-sm text-slate-700">{it.quantity}× {it.name} <span className="text-slate-500">₹{it.price}</span></div>
 ))}
 </div>
 </div>
 );
}

function CustomerOrders({ onOpenOrder }: { onOpenOrder: (id: string) => void }) {
 const [items, setItems] = useState<OrderListItem[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 api.get<{ items: OrderListItem[]; total: number }>('/api/v1/orders?page=1&pageSize=20')
 .then((r) => setItems(r.items))
 .finally(() => setLoading(false));
 }, []);

 if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

 return (
 <div className="p-4 space-y-2">
 <h2 className="text-sm font-semibold text-slate-700 mb-2">Your orders</h2>
 {items.length === 0 ? (
 <div className="text-center py-12">
 <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-2" />
 <p className="text-sm text-slate-600">No orders yet.</p>
 <p className="text-xs text-slate-500 mt-1">Place your first order to see it here.</p>
 </div>
 ) : (
 items.map((o) => (
 <button key={o.id} onClick={() => onOpenOrder(o.id)} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-orange-300">
 <div className="flex items-center justify-between mb-1">
 <span className="font-mono text-xs text-slate-500">#{o.shortCode}</span>
 <Badge variant="secondary" className="text-[10px]">{o.orderStatus.replace(/_/g, ' ')}</Badge>
 </div>
 <p className="text-sm font-medium text-slate-800">{o.restaurant.name}</p>
 <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()} • ₹{o.totalAmount}</p>
 </button>
 ))
 )}
 </div>
 );
}

function CustomerProfile({ onNavigate }: { onNavigate: (s: Screen) => void }) {
 const { user, logout } = useAuth();
 const items = [
 { label: 'Saved Addresses', icon: MapPin, screen: 'addresses' as Screen },
 { label: 'Order History', icon: ClipboardList, screen: 'orders' as Screen },
 { label: 'Notifications', icon: Bell, screen: 'notifications' as Screen },
 ];
 return (
 <div className="p-4 space-y-3">
 <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
 <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-xl">
 {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
 </div>
 <p className="text-sm font-medium text-slate-800 mt-2">{user?.fullName || 'Customer'}</p>
 <p className="text-xs text-slate-500">{user?.email}</p>
 <p className="text-xs text-slate-500">{user?.phone}</p>
 </div>

 <div className="bg-white border border-slate-200 rounded-xl divide-y">
 {items.map((it) => {
 const Icon = it.icon;
 return (
 <button key={it.label} onClick={() => onNavigate(it.screen)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
 <Icon className="w-4 h-4 text-slate-500" />
 <span className="flex-1 text-left">{it.label}</span>
 <ChevronRight className="w-4 h-4 text-slate-400" />
 </button>
 );
 })}
 </div>

 <Button variant="outline" className="w-full text-red-600 hover:text-red-700" onClick={logout}>Sign out</Button>
 </div>
 );
}

function CustomerAddresses() {
 const [items, setItems] = useState<Address[]>([]);
 const [loading, setLoading] = useState(true);
 const [showAdd, setShowAdd] = useState(false);

 const load = () => api.get<Address[]>('/api/v1/customers/addresses').then(setItems).finally(() => setLoading(false));
 useEffect(() => { load(); }, []);

 const remove = async (id: string) => {
 if (!confirm('Delete this address?')) return;
 try {
 await api.delete(`/api/v1/customers/addresses/${id}`);
 toast.success('Address removed');
 load();
 } catch (e) { toastApiError(e, 'Failed'); }
 };

 if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

 return (
 <div className="p-4 space-y-3">
 <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => setShowAdd(true)}>+ Add new address</Button>

 {items.length === 0 ? (
 <div className="text-center py-12 text-sm text-slate-500">No saved addresses yet.</div>
 ) : (
 items.map((a) => (
 <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3">
 <div className="flex items-start justify-between">
 <div>
 <Badge variant="secondary" className="text-[10px]">{a.label}</Badge>
 <p className="text-sm text-slate-700 mt-1">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
 <p className="text-xs text-slate-500">{a.city} {a.postalCode}</p>
 </div>
 <button onClick={() => remove(a.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
 </div>
 </div>
 ))
 )}

 <Dialog open={showAdd} onOpenChange={setShowAdd}>
 <DialogContent>
 <DialogHeader><DialogTitle>Add new address</DialogTitle></DialogHeader>
 <AddressForm onSaved={() => { setShowAdd(false); load(); }} />
 </DialogContent>
 </Dialog>
 </div>
 );
}

function CustomerNotifications() {
 const [items, setItems] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 api.get<{ items: any[] }>('/api/v1/notifications?page=1&pageSize=20')
 .then((r) => setItems(r.items))
 .finally(() => setLoading(false));
 }, []);

 if (loading) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

 return (
 <div className="p-4 space-y-2">
 {items.length === 0 ? (
 <div className="text-center py-12">
 <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
 <p className="text-sm text-slate-600">No notifications.</p>
 </div>
 ) : (
 items.map((n) => (
 <div key={n.id} className={cn('bg-white border rounded-lg p-3', n.isRead ? 'border-slate-200 opacity-70' : 'border-orange-200')}>
 <p className="text-sm font-medium text-slate-800">{n.title}</p>
 <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
 <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
 </div>
 ))
 )}
 </div>
 );
}
