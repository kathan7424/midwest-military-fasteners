/**
 * File Name: currency.utils.ts
 * Description: Store-wide price formatting driven by WooCommerce currency
 *   settings (WC → Settings → General). Nothing is hardcoded — the settings
 *   arrive via /custom/v1/checkout/locations and are registered once per
 *   environment (server layout + client provider).
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import type { WcCurrencySettings } from "@/types/checkout.types";

export type { WcCurrencySettings };

// US-dollar defaults apply only until WooCommerce settings load.
const DEFAULT_CURRENCY: WcCurrencySettings = {
  code: "USD",
  symbol: "$",
  position: "left",
  decimal_separator: ".",
  thousand_separator: ",",
  decimals: 2,
};

let store_currency: WcCurrencySettings = DEFAULT_CURRENCY;

export function set_store_currency(currency: Partial<WcCurrencySettings> | null | undefined): void {
  if (!currency?.code) {
    return;
  }

  store_currency = { ...DEFAULT_CURRENCY, ...currency };
}

export function get_store_currency(): WcCurrencySettings {
  return store_currency;
}

/**
 * Format an amount exactly like WooCommerce does — same symbol, position,
 * separators and decimal places as the store settings.
 */
export function format_store_price(value: unknown): string {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "";
  }

  const { symbol, position, decimal_separator, thousand_separator, decimals } =
    store_currency;

  const fixed = Math.abs(numeric).toFixed(decimals);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousand_separator);
  const amount =
    (numeric < 0 ? "-" : "") +
    grouped +
    (decimals > 0 ? decimal_separator + fraction : "");

  switch (position) {
    case "right":
      return `${amount}${symbol}`;
    case "left_space":
      return `${symbol} ${amount}`;
    case "right_space":
      return `${amount} ${symbol}`;
    case "left":
    default:
      return `${symbol}${amount}`;
  }
}
