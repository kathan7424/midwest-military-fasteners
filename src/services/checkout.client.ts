/**
 * File Name: checkout.client.ts
 * Description: Client-side checkout API wrappers (Next.js proxy routes).
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-15
 */

import { API_ROUTES } from "@/config/routes";
import { apiGet, apiPost } from "@/utils/api-client";
import type { CartData } from "@/types/cart.types";
import type {
  CheckoutAddress,
  CheckoutCartState,
  CheckoutErrorResponse,
  CheckoutLocations,
  CheckoutPlaceOrderResponse,
} from "@/types/checkout.types";

export type { ApiResult } from "@/utils/api-client";

export interface CheckoutStateResponse {
  cart: CartData;
  checkout: CheckoutCartState;
}

type CheckoutResult<T> = { ok: boolean; status: number; data: T };

export async function fetch_checkout_locations(): Promise<CheckoutLocations | null> {
  const { ok, data } = await apiGet<CheckoutLocations>(
    API_ROUTES.checkoutLocations,
    { retries: 2 }
  );
  return ok ? data : null;
}

export async function fetch_checkout_state(): Promise<
  CheckoutResult<CheckoutStateResponse & CheckoutErrorResponse>
> {
  return apiGet<CheckoutStateResponse & CheckoutErrorResponse>(
    API_ROUTES.checkout,
    // timeout > the proxy's 30s WP cart window (shipping recalculation can
    // trigger live Shippo carrier calls) — the client must never abort before
    // the proxy has had a chance to answer or fail cleanly with a message.
    { retries: 2, timeout: 35_000, headers: { "Cache-Control": "no-store" } }
  );
}

export async function update_checkout_address(payload: {
  shipping_address: Partial<CheckoutAddress>;
  billing_address?: Partial<CheckoutAddress>;
}): Promise<CheckoutResult<CheckoutStateResponse & CheckoutErrorResponse>> {
  return apiPost<CheckoutStateResponse & CheckoutErrorResponse>(
    API_ROUTES.cartCustomer,
    payload,
    { retries: 1 }
  );
}

export async function select_shipping_rate(payload: {
  package_id: number | string;
  rate_id: string;
}): Promise<CheckoutResult<CheckoutStateResponse & CheckoutErrorResponse>> {
  return apiPost<CheckoutStateResponse & CheckoutErrorResponse>(
    API_ROUTES.cartSelectShipping,
    payload,
    { retries: 1 }
  );
}

export async function apply_coupon(
  code: string
): Promise<CheckoutResult<CheckoutStateResponse & CheckoutErrorResponse>> {
  // retries: 0 — state-mutating; duplicate apply would cause WC error
  return apiPost<CheckoutStateResponse & CheckoutErrorResponse>(
    API_ROUTES.cartCoupon,
    { code },
    { retries: 0 }
  );
}

export async function remove_coupon(
  code: string
): Promise<CheckoutResult<CheckoutStateResponse & CheckoutErrorResponse>> {
  // DELETE with a JSON body — apiPost with method override covers this case.
  return apiPost<CheckoutStateResponse & CheckoutErrorResponse>(
    API_ROUTES.cartCoupon,
    { code },
    { method: "DELETE", retries: 0 }
  );
}

export async function place_order(payload: {
  billing_address: CheckoutAddress;
  shipping_address: CheckoutAddress;
  payment_method: string;
  payment_data: Array<{ key: string; value: string }>;
  customer_note?: string;
  create_account?: boolean;
  /** Cart item keys the customer opted into certification for. */
  cert_opted_in?: Record<string, boolean>;
}): Promise<CheckoutResult<CheckoutPlaceOrderResponse & CheckoutErrorResponse>> {
  // retries: 0 — never retry checkout; a duplicate POST creates a duplicate order
  return apiPost<CheckoutPlaceOrderResponse & CheckoutErrorResponse>(
    API_ROUTES.checkout,
    payload,
    { retries: 0, timeout: 30_000 }
  );
}

/**
 * Post-3DS: ask WP to verify the PaymentIntent result so the order is marked
 * paid immediately (classic WC does this via full-page redirect). Non-fatal —
 * the Stripe webhook is the fallback, so errors resolve to verified:false.
 */
export async function verify_payment_intent(payload: {
  redirect_url: string;
  order_id: number;
}): Promise<boolean> {
  const { ok, data } = await apiPost<{ verified?: boolean }>(
    API_ROUTES.checkoutVerifyIntent,
    payload,
    { retries: 1, timeout: 20_000 }
  );
  return ok && data.verified === true;
}
