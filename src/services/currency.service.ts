/**
 * File Name: currency.service.ts
 * Description: Server-side fetch of WooCommerce store settings (ISR-cached) —
 *   currency options + checkout behavior (guest checkout, coupons, fields).
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { ENV } from "@/config/env";
import type {
  CheckoutLocations,
  WcCheckoutSettings,
  WcCurrencySettings,
} from "@/types/checkout.types";

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * WooCommerce settings for server components. 5-min ISR in prod (admins
 * change these rarely); always fresh in dev so WC changes reflect instantly.
 */
export async function fetch_store_settings(): Promise<CheckoutLocations | null> {
  try {
    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/checkout/locations`,
      {
        ...(IS_DEV ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CheckoutLocations;
  } catch {
    return null;
  }
}

export async function fetch_store_currency(): Promise<WcCurrencySettings | null> {
  const settings = await fetch_store_settings();

  return settings?.currency ?? null;
}

// WooCommerce core defaults — used only when WP is unreachable.
export const DEFAULT_CHECKOUT_SETTINGS: WcCheckoutSettings = {
  guest_checkout: true,
  login_reminder: true,
  signup_enabled: false,
  registration_enabled: true,
  coupons_enabled: true,
  order_notes_enabled: true,
  fields: {
    company: "optional",
    address_2: "optional",
    phone: "required",
  },
};

export async function fetch_checkout_settings(): Promise<WcCheckoutSettings> {
  const settings = await fetch_store_settings();

  return settings?.checkout ?? DEFAULT_CHECKOUT_SETTINGS;
}
