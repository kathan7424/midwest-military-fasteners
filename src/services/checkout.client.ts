/**
 * File Name: checkout.client.ts
 * Description: Client-side checkout API wrappers (Next.js proxy routes).
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import { API_ROUTES } from "@/config/routes";
import type { CartData } from "@/types/cart.types";
import type {
  CheckoutAddress,
  CheckoutCartState,
  CheckoutErrorResponse,
  CheckoutLocations,
  CheckoutPlaceOrderResponse,
} from "@/types/checkout.types";

export interface CheckoutStateResponse {
  cart: CartData;
  checkout: CheckoutCartState;
}

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

async function parse_response<T>(response: Response): Promise<ApiResult<T>> {
  return {
    ok: response.ok,
    status: response.status,
    data: (await response.json()) as T,
  };
}

export async function fetch_checkout_locations(): Promise<CheckoutLocations | null> {
  try {
    const response = await fetch(API_ROUTES.checkoutLocations, { method: "GET" });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CheckoutLocations;
  } catch {
    return null;
  }
}

export async function fetch_checkout_state(): Promise<
  ApiResult<CheckoutStateResponse & CheckoutErrorResponse>
> {
  const response = await fetch(API_ROUTES.checkout, {
    method: "GET",
    cache: "no-store",
  });

  return parse_response(response);
}

export async function update_checkout_address(payload: {
  shipping_address: Partial<CheckoutAddress>;
  billing_address?: Partial<CheckoutAddress>;
}): Promise<ApiResult<CheckoutStateResponse & CheckoutErrorResponse>> {
  const response = await fetch(API_ROUTES.cartCustomer, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parse_response(response);
}

export async function select_shipping_rate(payload: {
  package_id: number | string;
  rate_id: string;
}): Promise<ApiResult<CheckoutStateResponse & CheckoutErrorResponse>> {
  const response = await fetch(API_ROUTES.cartSelectShipping, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parse_response(response);
}

export async function place_order(payload: {
  billing_address: CheckoutAddress;
  shipping_address: CheckoutAddress;
  payment_method: string;
  payment_data: Array<{ key: string; value: string | boolean }>;
  customer_note?: string;
}): Promise<ApiResult<CheckoutPlaceOrderResponse & CheckoutErrorResponse>> {
  const response = await fetch(API_ROUTES.checkout, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parse_response(response);
}
