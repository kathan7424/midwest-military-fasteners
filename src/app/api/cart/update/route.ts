/**
 * File Name: route.ts
 * Description: Proxy cart item quantity updates to WooCommerce Store API.
 * Developer: KP-184
 * Created Date: 2026-07-07
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
    const body = (await request.json()) as {
      cart_item_key?: string;
      quantity?: number;
    };
    const cartItemKey = body.cart_item_key?.trim();
    const rawQuantity = Number(body.quantity);
    const quantity = Number.isFinite(rawQuantity)
      ? Math.min(9999, Math.max(1, Math.trunc(rawQuantity)))
      : 1;

    if (!cartItemKey) {
      return Response.json(
        { message: "Cart item key is required." },
        { status: 400 }
      );
    }

    const wpResponse = await wcStoreMutation(request, "cart/update-item", {
      key: cartItemKey,
      quantity,
    });

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
