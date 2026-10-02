// In-memory cart store — no DB calls on add/remove, only synced at checkout.
// Cart is intentionally ephemeral: it resets on app restart.

import { create } from 'zustand';

export interface CartLineItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  isVeg: boolean;
}

interface CartRestaurant {
  id: string;
  name: string;
}

interface CartState {
  restaurant: CartRestaurant | null;
  items: CartLineItem[];

  // ── Computed helpers (call these as plain functions, not selectors) ──────────
  // They're exposed on the store so components can call them without importing
  // separate utils.
  totalItems: () => number;
  subtotal: () => number;

  // ── Mutations ────────────────────────────────────────────────────────────────

  /**
   * Add one unit of an item.
   * Returns 'ok'       — item added / incremented.
   * Returns 'mismatch' — cart belongs to a different restaurant; caller should
   *                      ask the user to confirm, then call replaceAndAdd().
   */
  addItem: (
    restaurant: CartRestaurant,
    item: Omit<CartLineItem, 'quantity'>,
  ) => 'ok' | 'mismatch';

  /** Overwrite the quantity of an item. qty <= 0 removes the item entirely. */
  setQty: (menuItemId: string, qty: number) => void;

  /** Clear everything — called after a successful order or explicit clear. */
  clearCart: () => void;

  /**
   * Clear the current cart and immediately add the new item.
   * Used when the user confirms switching restaurants.
   */
  replaceAndAdd: (
    restaurant: CartRestaurant,
    item: Omit<CartLineItem, 'quantity'>,
  ) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  restaurant: null,
  items: [],

  // ── Computed ─────────────────────────────────────────────────────────────────
  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  // ── Mutations ─────────────────────────────────────────────────────────────────
  addItem: (restaurant, item) => {
    const { restaurant: current, items } = get();

    // Different restaurant → signal mismatch without mutating state
    if (current && current.id !== restaurant.id) {
      return 'mismatch';
    }

    const existing = items.find((i) => i.menuItemId === item.menuItemId);

    set({
      restaurant,
      items: existing
        ? items.map((i) =>
            i.menuItemId === item.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i,
          )
        : [...items, { ...item, quantity: 1 }],
    });

    return 'ok';
  },

  setQty: (menuItemId, qty) => {
    set((state) => {
      const newItems =
        qty <= 0
          ? state.items.filter((i) => i.menuItemId !== menuItemId)
          : state.items.map((i) =>
              i.menuItemId === menuItemId ? { ...i, quantity: qty } : i,
            );

      return {
        items: newItems,
        // Clear restaurant ref when cart becomes empty
        restaurant: newItems.length === 0 ? null : state.restaurant,
      };
    });
  },

  clearCart: () => set({ restaurant: null, items: [] }),

  replaceAndAdd: (restaurant, item) => {
    set({
      restaurant,
      items: [{ ...item, quantity: 1 }],
    });
  },
}));
