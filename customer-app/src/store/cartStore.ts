import { create } from 'zustand';
import { CartItem, CartResponse } from '../types';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCartApi,
} from '../api/cartApi';

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isFetching: boolean;
  fetchError: boolean;

  // Sync cart from server
  fetchCart: () => Promise<void>;

  // Optimistic helpers that also persist to server
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateItem: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;

  // Set from server response (used internally)
  _setFromResponse: (res: CartResponse) => void;
}

const countItems = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + i.quantity, 0);

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  itemCount: 0,
  isFetching: false,
  fetchError: false,

  _setFromResponse: (res: CartResponse) => {
    const items = res.items ?? [];
    set({
      items,
      total: res.total ?? 0,
      itemCount: countItems(items),
      fetchError: false,
    });
  },

  fetchCart: async () => {
    set({ isFetching: true, fetchError: false });
    try {
      const res = await getCart();
      get()._setFromResponse(res);
    } catch {
      set({ fetchError: true });
    } finally {
      set({ isFetching: false });
    }
  },

  addItem: async (productId: number, quantity = 1) => {
    const res = await addToCart(productId, quantity);
    get()._setFromResponse(res);
  },

  updateItem: async (productId: number, quantity: number) => {
    // Optimistic update
    const prev = get().items;
    const optimistic = prev.map((i) =>
      i.productId === productId
        ? { ...i, quantity, subtotal: i.price * quantity }
        : i
    );
    set({ items: optimistic, itemCount: countItems(optimistic) });

    try {
      const res = await updateCartItem(productId, quantity);
      get()._setFromResponse(res);
    } catch {
      // Rollback on error
      set({ items: prev, itemCount: countItems(prev) });
      throw new Error('Failed to update quantity');
    }
  },

  removeItem: async (productId: number) => {
    // Optimistic removal
    const prev = get().items;
    const optimistic = prev.filter((i) => i.productId !== productId);
    const newTotal = optimistic.reduce((s, i) => s + i.subtotal, 0);
    set({ items: optimistic, itemCount: countItems(optimistic), total: newTotal });

    try {
      await removeCartItem(productId);
      // Sync actual total from server
      const res = await getCart();
      get()._setFromResponse(res);
    } catch {
      // Rollback on error
      set({ items: prev, itemCount: countItems(prev) });
      throw new Error('Failed to remove item');
    }
  },

  clearCart: async () => {
    const prev = get().items;
    set({ items: [], total: 0, itemCount: 0 });
    try {
      await clearCartApi();
    } catch {
      set({ items: prev, itemCount: countItems(prev) });
      throw new Error('Failed to clear cart');
    }
  },
}));
