/**
 * File Name: route.ts
 * Description: Proxy cart item quantity updates to WooCommerce Store API.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import {
  buildStoreCartMutationResponse,
  buildWcStoreHeaders,
  fetchStoreCart,
} from "@/utils/wc-cart-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      cart_item_key?: string;
      quantity?: number;
    };
    const cartItemKey = body.cart_item_key?.trim();
    const quantity = Math.max(1, Number(body.quantity) || 1);

    if (!cartItemKey) {
      return Response.json(
        { message: "Cart item key is required." },
        { status: 400 }
      );
    }

    const bootstrapResponse = await fetchStoreCart(request);

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/wc/store/v1/cart/update-item`,
      {
        method: "POST",
        headers: buildWcStoreHeaders(request, true, bootstrapResponse),
        body: JSON.stringify({
          key: cartItemKey,
          quantity,
        }),
        cache: "no-store",
      }
    );

    return buildStoreCartMutationResponse(
      wpResponse,
      "Cart quantity updated."
    );
  } catch (error) {
    console.error("Cart update proxy error:", error);
    return Response.json(
      { message: "Cart update failed." },
      { status: 500 }
    );
  }
}
