/**
 * File Name: route.ts
 * Description: Proxy cart item removal to WooCommerce Store API.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
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
    const body = (await request.json()) as { cart_item_key?: string };
    const cartItemKey = body.cart_item_key?.trim();

    if (!cartItemKey) {
      return Response.json(
        { message: "Cart item key is required." },
        { status: 400 }
      );
    }

    const bootstrapResponse = await fetchStoreCart(request);

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/wc/store/v1/cart/remove-item`,
      {
        method: "POST",
        headers: buildWcStoreHeaders(request, true, bootstrapResponse),
        body: JSON.stringify({
          key: cartItemKey,
        }),
        cache: "no-store",
      }
    );

    return buildStoreCartMutationResponse(
      wpResponse,
      "Item removed from your order."
    );
  } catch (error) {
    console.error("Cart remove proxy error:", error);
    return Response.json(
      { message: "Remove from cart failed." },
      { status: 500 }
    );
  }
}
