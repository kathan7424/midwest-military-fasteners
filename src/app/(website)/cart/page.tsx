/**
 * File Name: page.tsx
 * Description: Cart / Your Order page — Figma layout, protected route.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-14
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";

import CartPageView from "@/components/pages/Cart/CartPageView";
import { fetch_sidebar_categories } from "@/services/spec-parts.service";
import { fetch_checkout_settings } from "@/services/currency.service";

export const metadata: Metadata = {
  title: "Your Cart | Midwest Military Fasteners",
  description: "View your Midwest Military Fasteners order.",
};

export default async function CartPage() {
  // No auth gate — WooCommerce always allows guests to view their cart.
  const cookie_store = await cookies();
  const isLoggedIn = cookie_store
    .getAll()
    .some((c) => c.name.startsWith("wordpress_logged_in_"));

  const [sidebar_categories, checkout_settings] = await Promise.all([
    fetch_sidebar_categories(),
    fetch_checkout_settings(),
  ]);

  return (
    <CartPageView
      sidebarCategories={sidebar_categories}
      couponsEnabled={checkout_settings.coupons_enabled}
      isLoggedIn={isLoggedIn}
    />
  );
}
