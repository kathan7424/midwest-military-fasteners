/**
 * File Name: route.ts
 * Description: Proxy cart item removal to WooCommerce Store API.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest } from "next/server";

import {
  buildStoreCartMutationResponse,
  wcStoreMutation,
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

    const wpResponse = await wcStoreMutation(request, "cart/remove-item", {
      key: cartItemKey,
    });

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
