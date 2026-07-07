/**
 * File Name: CartProvider.tsx
 * Description: Loads cart state for authenticated sessions.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { useEffect } from "react";

import { useCartStore } from "@/stores/cart.store";

interface CartProviderProps {
  isLoggedIn: boolean;
  children: React.ReactNode;
}

export default function CartProvider({
  isLoggedIn,
  children,
}: CartProviderProps) {
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    if (isLoggedIn) {
      void fetchCart();
    } else {
      useCartStore.getState().setCart(null);
    }
  }, [fetchCart, isLoggedIn]);

  return <>{children}</>;
}
