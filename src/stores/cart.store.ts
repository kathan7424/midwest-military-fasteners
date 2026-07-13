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
import { getCartItemStockMessage } from "@/utils/cart-stock.utils";
import { notifyError, notifySuccess, notifyWarning } from "@/utils/notifications";

interface CartState {
  cart: CartData | null;
  isLoading: boolean;
  isMutating: boolean;
  updatingItemKey: string | null;
  fetchCart: () => Promise<void>;
  addItem: (payload: {
    productId?: number;
    sku?: string;
    productName?: string;
    quantity: number;
  }) => Promise<boolean>;
  updateItem: (cartItemKey: string, quantity: number) => Promise<boolean>;
  removeItem: (cartItemKey: string) => Promise<boolean>;
  setCart: (cart: CartData | null) => void;
}

/**
 * WooCommerce-style session guard: an expired/missing login on a cart action
 * shows the WC notice and sends the visitor to login, returning here after.
 */
function handle_session_expired(): void {
  notifyError("You must be logged in to manage your order.");

  if (typeof window !== "undefined") {
    const redirect = encodeURIComponent(
      window.location.pathname + window.location.search
    );
    window.location.href = `/login?redirect=${redirect}`;
  }
}

const EMPTY_CART: CartData = {
  items: [],
  item_count: 0,
  subtotal: "",
  shipping_total: "",
  tax_total: "",
  discount_total: "",
  total: "",
  checkout_url: "",
  cart_url: "",
  coupons: [],
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
    // Stale-while-revalidate: only show the loading state on the very first
    // fetch. Background refreshes keep the current cart on screen.
    if (get().cart === null) {
      set({ isLoading: true });
    }

    try {
      const { ok, status, data } = await fetch_cart();

      if (status === 401) {
        set({ cart: EMPTY_CART });
        return;
      }

      if (!ok) {
        if (status === 404 || status === 400) {
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

  async addItem({ productId, sku, productName, quantity }) {
    if (!productId && !sku) {
      notifyError("Product information is missing.");
      return false;
    }

    set({ isMutating: true });

    try {
      const { ok, status, data } = await add_cart_item({
        productId,
        sku,
        quantity,
      });

      if (status === 401) {
        handle_session_expired();
        return false;
      }

      if (!ok) {
        const errorData = data as CartErrorResponse;
        throw new Error(errorData.message || "Unable to add item.");
      }

      set({ cart: data.cart });
      notifySuccess(
        productName
          ? `“${productName}” has been added to your cart.`
          : "Product added to your cart.",
        {
          label: "View cart",
          href: "/cart",
        }
      );
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
      const { ok, status, data } = await remove_cart_item(cartItemKey);

      if (status === 401) {
        handle_session_expired();
        return false;
      }

      if (!ok) {
        const errorData = data as CartErrorResponse;
        throw new Error(errorData.message || "Unable to remove item.");
      }

      set({ cart: data.cart });
      notifySuccess(data.message || "Item removed.");
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
      const { ok, status, data } = await update_cart_item({
        cart_item_key: cartItemKey,
        quantity,
      });

      if (status === 401) {
        if (previousCart) {
          set({ cart: previousCart });
        }
        handle_session_expired();
        return false;
      }

      if (!ok) {
        const errorData = data as CartErrorResponse;
        throw new Error(errorData.message || "Unable to update quantity.");
      }

      set({ cart: data.cart });
      const updated_item = data.cart.items.find((item) => item.key === cartItemKey);
      const stock_message = updated_item
        ? getCartItemStockMessage(updated_item)
        : null;

      if (stock_message && quantity > (previousCart?.items.find((item) => item.key === cartItemKey)?.quantity ?? 0)) {
        notifyWarning(stock_message);
      } else {
        // WooCommerce-style confirmation. Fixed message = stable toast id, so
        // rapid +/- clicks replace the toast instead of stacking.
        notifySuccess("Cart updated.");
      }

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
