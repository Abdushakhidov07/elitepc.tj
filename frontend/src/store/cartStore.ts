import { create } from 'zustand';
import type { CartItem } from '../types';
import * as cartApi from '../api/cart';
import { getAccessToken } from '../api/client';

interface CartState {
  items: CartItem[];
  total: number;
  count: number;
  loading: boolean;
  error: string | null;

  fetchCart: () => Promise<void>;
  addItem: (data: cartApi.AddToCartData) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;

  // Local-only operations for guest cart (localStorage)
  getLocalCart: () => CartItem[];
  syncCartOnLogin: () => Promise<void>;
}

const LOCAL_CART_KEY = 'elitepc_guest_cart';

/**
 * Read the guest cart from localStorage.
 */
function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

/**
 * Write the guest cart to localStorage.
 */
function writeLocalCart(items: CartItem[]): void {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
}

/**
 * Compute totals from a list of cart items.
 */
function computeTotals(items: CartItem[]): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const item of items) {
    total += parseFloat(item.item_total || '0');
    count += item.quantity;
  }
  return { total, count };
}

function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  count: 0,
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      if (isAuthenticated()) {
        const response = await cartApi.getCart();
        set({
          items: response.items,
          total: parseFloat(String(response.total)) || 0,
          count: response.count,
          loading: false,
        });
      } else {
        const items = readLocalCart();
        const { total, count } = computeTotals(items);
        set({ items, total, count, loading: false });
      }
    } catch {
      set({ loading: false, error: 'Ошибка загрузки корзины.' });
    }
  },

  addItem: async (data: cartApi.AddToCartData) => {
    set({ loading: true, error: null });
    try {
      if (isAuthenticated()) {
        await cartApi.addToCart(data);
        // Re-fetch the entire cart to get updated totals
        await get().fetchCart();
      } else {
        // Guest cart: add or update in localStorage
        const items = readLocalCart();
        const existingIndex = items.findIndex(
          (item) =>
            (data.product_id && item.product?.id === data.product_id) ||
            (data.configuration_id && item.configuration?.id === data.configuration_id)
        );

        if (existingIndex >= 0) {
          items[existingIndex].quantity += data.quantity || 1;
          // Recalculate item_total
          const price = items[existingIndex].product
            ? parseFloat(items[existingIndex].product!.current_price)
            : 0;
          items[existingIndex].item_total = (
            price * items[existingIndex].quantity
          ).toFixed(2);
        } else {
          // For guest carts, store product data from _product field
          const product = data._product || null;
          const price = product ? parseFloat(product.current_price) : 0;
          const qty = data.quantity || 1;
          const newItem: CartItem = {
            id: Date.now(), // temporary local ID
            product: product,
            configuration: null,
            quantity: qty,
            with_assembly: data.with_assembly || false,
            item_total: (price * qty).toFixed(2),
          };
          items.push(newItem);
        }

        writeLocalCart(items);
        const { total, count } = computeTotals(items);
        set({ items, total, count, loading: false });
      }
    } catch {
      set({ loading: false, error: 'Ошибка добавления в корзину.' });
    }
  },

  updateItem: async (itemId: number, quantity: number) => {
    set({ loading: true, error: null });
    try {
      if (isAuthenticated()) {
        await cartApi.updateCartItem(itemId, { quantity });
        await get().fetchCart();
      } else {
        const items = readLocalCart();
        const index = items.findIndex((item) => item.id === itemId);
        if (index >= 0) {
          items[index].quantity = quantity;
          const price = items[index].product
            ? parseFloat(items[index].product!.current_price)
            : 0;
          items[index].item_total = (price * quantity).toFixed(2);
          writeLocalCart(items);
          const { total, count } = computeTotals(items);
          set({ items, total, count, loading: false });
        } else {
          set({ loading: false });
        }
      }
    } catch {
      set({ loading: false, error: 'Ошибка обновления корзины.' });
    }
  },

  removeItem: async (itemId: number) => {
    set({ loading: true, error: null });
    try {
      if (isAuthenticated()) {
        await cartApi.removeCartItem(itemId);
        await get().fetchCart();
      } else {
        let items = readLocalCart();
        items = items.filter((item) => item.id !== itemId);
        writeLocalCart(items);
        const { total, count } = computeTotals(items);
        set({ items, total, count, loading: false });
      }
    } catch {
      set({ loading: false, error: 'Ошибка удаления из корзины.' });
    }
  },

  clearCart: async () => {
    set({ loading: true, error: null });
    try {
      if (isAuthenticated()) {
        await cartApi.clearCart();
      }
      localStorage.removeItem(LOCAL_CART_KEY);
      set({ items: [], total: 0, count: 0, loading: false });
    } catch {
      set({ loading: false, error: 'Ошибка очистки корзины.' });
    }
  },

  getLocalCart: () => {
    return readLocalCart();
  },

  syncCartOnLogin: async () => {
    // After login, merge guest cart items into the server cart
    const localItems = readLocalCart();
    if (localItems.length === 0) {
      await get().fetchCart();
      return;
    }

    try {
      for (const item of localItems) {
        if (item.product?.id) {
          await cartApi.addToCart({
            product_id: item.product.id,
            quantity: item.quantity,
            with_assembly: item.with_assembly,
          });
        } else if (item.configuration?.id) {
          await cartApi.addToCart({
            configuration_id: item.configuration.id,
            quantity: item.quantity,
            with_assembly: item.with_assembly,
          });
        }
      }
      // Clear the local cart after merging
      localStorage.removeItem(LOCAL_CART_KEY);
      // Fetch the updated server cart
      await get().fetchCart();
    } catch {
      // Even if merge fails partially, fetch whatever the server has
      await get().fetchCart();
    }
  },
}));
