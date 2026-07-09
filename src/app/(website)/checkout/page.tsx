/**
 * File Name: page.tsx
 * Description: Headless checkout — WooCommerce Store API + Stripe. Protected route.
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import type { Metadata } from "next";

import CheckoutPageView from "@/components/pages/Checkout/CheckoutPageView";
import { requireAuth } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "Checkout | Midwest Military Fasteners",
  description: "Complete your Midwest Military Fasteners order.",
};

export default async function CheckoutPage() {
  await requireAuth("/checkout");

  return <CheckoutPageView />;
}
