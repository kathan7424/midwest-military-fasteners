/**
 * File Name: cart.service.ts
 * Description: Client-side cart API service wrappers.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { API_ROUTES } from "@/config/routes";
import {
  CartAddResponse,
  CartData,
  CartErrorResponse,
  CartRemoveResponse,
} from "@/types/cart.types";

export interface CartApiResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

async function parse_cart_response<T>(response: Response): Promise<CartApiResponse<T>> {
  return {
    ok: response.ok,
    status: response.status,
    data: (await response.json()) as T,
  };
}

export async function fetch_cart(): Promise<CartApiResponse<CartData | CartErrorResponse>> {
  const response = await fetch(API_ROUTES.cart, {
    method: "GET",
    cache: "no-store",
  });

  return parse_cart_response<CartData | CartErrorResponse>(response);
}

export async function add_cart_item(payload: {
  productId?: number;
  sku?: string;
  quantity: number;
}): Promise<CartApiResponse<CartAddResponse & CartErrorResponse>> {
  const response = await fetch(API_ROUTES.cart, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: payload.productId,
      sku: payload.sku,
      quantity: payload.quantity,
    }),
  });

  return parse_cart_response<CartAddResponse & CartErrorResponse>(response);
}

export async function remove_cart_item(
  cart_item_key: string
): Promise<CartApiResponse<CartRemoveResponse & CartErrorResponse>> {
  const response = await fetch(API_ROUTES.cartRemove, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cart_item_key,
    }),
  });

  return parse_cart_response<CartRemoveResponse & CartErrorResponse>(response);
}

export async function update_cart_item(payload: {
  cart_item_key: string;
  quantity: number;
}): Promise<CartApiResponse<CartRemoveResponse & CartErrorResponse>> {
  const response = await fetch(API_ROUTES.cartUpdate, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cart_item_key: payload.cart_item_key,
      quantity: payload.quantity,
    }),
  });

  return parse_cart_response<CartRemoveResponse & CartErrorResponse>(response);
}
