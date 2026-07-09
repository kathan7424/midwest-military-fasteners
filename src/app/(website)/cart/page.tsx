/**
 * File Name: page.tsx
 * Description: Cart / Your Order page — Figma layout, protected route.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

import type { Metadata } from "next";

import CartPageView from "@/components/pages/Cart/CartPageView";
import { fetch_sidebar_categories } from "@/services/spec-parts.service";

export const metadata: Metadata = {
  title: "Your Cart | Midwest Military Fasteners",
  description: "View your Midwest Military Fasteners order.",
};

export default async function CartPage() {
  // No auth gate — WooCommerce always allows guests to view their cart.
  const sidebar_categories = await fetch_sidebar_categories();

  return <CartPageView sidebarCategories={sidebar_categories} />;
}
