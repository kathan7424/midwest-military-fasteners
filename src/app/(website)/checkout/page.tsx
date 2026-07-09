/**
 * File Name: page.tsx
 * Description: Headless checkout — WooCommerce Store API + Stripe.
 *   Guest access follows WC → Accounts & Privacy ("Allow customers to place
 *   orders without an account") — no static auth gate.
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-09
 */

import type { Metadata } from "next";

import CheckoutPageView from "@/components/pages/Checkout/CheckoutPageView";
import { isUserLoggedIn, requireAuth } from "@/services/auth.service";
import { fetch_checkout_settings } from "@/services/currency.service";

export const metadata: Metadata = {
  title: "Checkout | Midwest Military Fasteners",
  description: "Complete your Midwest Military Fasteners order.",
};

export default async function CheckoutPage() {
  const [settings, loggedIn] = await Promise.all([
    fetch_checkout_settings(),
    isUserLoggedIn(),
  ]);

  // WooCommerce standard: guests may check out unless the admin disabled it.
  if (!settings.guest_checkout && !loggedIn) {
    await requireAuth("/checkout");
  }

  return <CheckoutPageView settings={settings} isLoggedIn={loggedIn} />;
}
