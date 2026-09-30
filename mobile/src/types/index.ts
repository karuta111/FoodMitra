export interface User { id: string; phone: string; email?: string | null; role: 'ADMIN' | 'CUSTOMER'; fullName?: string; }
export interface Restaurant { id: string; name: string; logoUrl: string | null; cuisine: string; avgRating: number; ratingCount: number; availability: string; }
export interface MenuItem { id: string; name: string; description: string | null; price: number; isVeg: boolean; availability: string; }
export interface MenuCategory { id: string; name: string; items: MenuItem[]; }
export interface CartItem { id: string | null; menuItemId: string; name: string; unitPrice: number; quantity: number; subtotal: number; isVeg: boolean; availability: string; }
export interface Cart { id: string; restaurant: { id: string; name: string }; items: CartItem[]; subtotal: number; estimatedDeliveryFee: number; estimatedTotal: number; minOrderAmount: number; meetsMinimum: boolean; }
export interface Address { id: string; label: string; line1: string; city: string; postalCode: string | null; latitude: number; longitude: number; }
export interface Order { id: string; shortCode: string; orderStatus: string; totalAmount: number; createdAt: string; restaurant: { id: string; name: string }; }
