/**
 * File Name: cart.store.ts
 * Description: Client-side WooCommerce cart state.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { create } from "zustand";

import {
  add_cart_item,
  fetch_cart,
  remove_cart_item,
} from "@/services/cart.service";
import {
  CartData,
  CartErrorResponse,
} from "@/types/cart.types";
import { notifyError, notifySuccess } from "@/utils/notifications";

interface CartState {
  cart: CartData | null;
  isLoading: boolean;
  isMutating: boolean;
  fetchCart: () => Promise<void>;
  addItem: (payload: {
    productId?: number;
    sku?: string;
    quantity: number;
  }) => Promise<boolean>;
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

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  isMutating: false,

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
        throw new Error(data.message || "Unable to add item.");
      }

      set({ cart: data.cart });
      notifySuccess(data.message || "Item added to your order.");
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to add item.";
      notifyError(message);
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
        throw new Error(data.message || "Unable to remove item.");
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
}));

export function getCartItemCount(cart: CartData | null): number {
  return cart?.item_count ?? 0;
}
