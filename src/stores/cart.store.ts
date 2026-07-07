/**
 * File Name: cart.store.ts
 * Description: Client-side WooCommerce cart state.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

"use client";

import { create } from "zustand";

import {
  add_cart_item,
  fetch_cart,
  remove_cart_item,
  update_cart_item,
} from "@/services/cart.service";
import { CartData, CartErrorResponse, CartItem } from "@/types/cart.types";
import { notifyError, notifySuccess } from "@/utils/notifications";

interface CartState {
  cart: CartData | null;
  isLoading: boolean;
  isMutating: boolean;
  updatingItemKey: string | null;
  fetchCart: () => Promise<void>;
  addItem: (payload: {
    productId?: number;
    sku?: string;
    quantity: number;
  }) => Promise<boolean>;
  updateItem: (cartItemKey: string, quantity: number) => Promise<boolean>;
  removeItem: (cartItemKey: string) => Promise<boolean>;
  setCart: (cart: CartData | null) => void;
}

const EMPTY_CART: CartData = {
  items: [],
  item_count: 0,
  subtotal: "",
  total: "",
  checkout_url: "",
  cart_url: "",
};

function getCartItemCountFromItems(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function buildOptimisticCart(
  cart: CartData,
  cartItemKey: string,
  quantity: number
): CartData {
  const items = cart.items.map((item) =>
    item.key === cartItemKey ? { ...item, quantity } : item
  );

  return {
    ...cart,
    items,
    item_count: getCartItemCountFromItems(items),
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  isMutating: false,
  updatingItemKey: null,

  setCart(cart) {
    set({ cart });
  },

  async fetchCart() {
    set({ isLoading: true });

    try {
      const { ok, status, data } = await fetch_cart();

      if (status === 401) {
        set({ cart: EMPTY_CART });
        return;
      }

      if (!ok) {
        if (status === 404) {
          set({ cart: EMPTY_CART });
          return;
        }

        console.warn(
          "Cart fetch failed:",
          data && "message" in data ? data.message || data.code : "Cart request failed."
        );
        set({ cart: EMPTY_CART });
        return;
      }

      set({ cart: data as CartData });
    } catch (error) {
      console.warn("Fetch cart failed:", error);
      set({ cart: EMPTY_CART });
    } finally {
      set({ isLoading: false });
    }
  },

  async addItem({ productId, sku, quantity }) {
    if (!productId && !sku) {
      notifyError("Product information is missing.");
      return false;
    }

    set({ isMutating: true });

    try {
      const { ok, data } = await add_cart_item({
        productId,
        sku,
        quantity,
      });

      if (!ok) {
        const errorData = data as CartErrorResponse;
        throw new Error(errorData.message || "Unable to add item.");
      }

      set({ cart: data.cart });
      notifySuccess(data.message || "Item added to your order.");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add item.";
      notifyError(message);
      await get().fetchCart();
      return false;
    } finally {
      set({ isMutating: false });
    }
  },

  async removeItem(cartItemKey) {
    set({ isMutating: true });

    try {
      const { ok, data } = await remove_cart_item(cartItemKey);

      if (!ok) {
        const errorData = data as CartErrorResponse;
        throw new Error(errorData.message || "Unable to remove item.");
      }

      set({ cart: data.cart });
      notifySuccess(data.message || "Item removed from your order.");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to remove item.";
      notifyError(message);
      return false;
    } finally {
      set({ isMutating: false });
    }
  },

  async updateItem(cartItemKey, quantity) {
    const previousCart = get().cart;

    if (previousCart) {
      set({
        cart: buildOptimisticCart(previousCart, cartItemKey, quantity),
        updatingItemKey: cartItemKey,
      });
    } else {
      set({ updatingItemKey: cartItemKey });
    }

    try {
      const { ok, data } = await update_cart_item({
        cart_item_key: cartItemKey,
        quantity,
      });

      if (!ok) {
        const errorData = data as CartErrorResponse;
        throw new Error(errorData.message || "Unable to update quantity.");
      }

      set({ cart: data.cart });
      return true;
    } catch (error) {
      if (previousCart) {
        set({ cart: previousCart });
      }

      const message =
        error instanceof Error ? error.message : "Unable to update quantity.";
      notifyError(message);
      await get().fetchCart();
      return false;
    } finally {
      set({ updatingItemKey: null });
    }
  },
}));

export function getCartItemCount(cart: CartData | null): number {
  return cart?.item_count ?? 0;
}
