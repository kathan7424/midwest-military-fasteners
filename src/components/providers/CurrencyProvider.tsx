/**
 * File Name: CurrencyProvider.tsx
 * Description: Registers WooCommerce currency settings in the client-side
 *   formatter module so every price on the site follows WC → Settings →
 *   General (symbol, position, separators, decimals). Renders nothing.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import type { WcCurrencySettings } from "@/types/checkout.types";
import { set_store_currency } from "@/utils/currency.utils";

export default function CurrencyProvider({
  currency,
}: {
  currency: WcCurrencySettings | null;
}) {
  // Set during render (not an effect) so formatting is correct on the very
  // first client render — before any product table paints.
  set_store_currency(currency);

  return null;
}
