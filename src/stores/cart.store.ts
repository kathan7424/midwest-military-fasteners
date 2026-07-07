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
  CartAddResponse,
  CartData,
  CartErrorResponse,
  CartRemoveResponse,
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

async function parseCartError(response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as CartErrorResponse & {
    code?: string;
  };

  return data.message || data.code || "Cart request failed.";
}

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
      const response = await fetch("/api/cart", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        set({ cart: EMPTY_CART });
        return;
      }

      if (!response.ok) {
        if (response.status === 404) {
          set({ cart: EMPTY_CART });
          return;
        }

        console.warn("Cart fetch failed:", await parseCartError(response));
        set({ cart: EMPTY_CART });
        return;
      }

      const cart = (await response.json()) as CartData;
      set({ cart });
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
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          sku,
          quantity,
        }),
      });

      const data = (await response.json()) as CartAddResponse & CartErrorResponse;

      if (!response.ok) {
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
      const response = await fetch("/api/cart/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart_item_key: cartItemKey,
        }),
      });

      const data = (await response.json()) as CartRemoveResponse & CartErrorResponse;

      if (!response.ok) {
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
