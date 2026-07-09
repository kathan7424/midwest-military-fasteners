/**
 * File Name: route.ts
 * Description: Proxy cart GET/POST to WooCommerce Store API.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import {
  buildStoreCartMutationResponse,
  buildStoreCartResponse,
  buildWcStoreHeaders,
  fetchStoreCart,
  fetchStoreCartWithRecovery,
  resolveProductIdBySku,
} from "@/utils/wc-cart-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    const wpResponse = await fetchStoreCartWithRecovery(request);
    return buildStoreCartResponse(wpResponse, { allowEmptyOnFailure: true });
  } catch (error) {
    console.error("Cart GET proxy error:", error);
    return Response.json({ message: "Cart fetch failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      product_id?: number;
      sku?: string;
      quantity?: number;
    };

    let productId = Number(body.product_id) || 0;
    const sku = typeof body.sku === "string" ? body.sku.trim() : "";
    const rawQuantity = Number(body.quantity);
    const quantity = Number.isFinite(rawQuantity)
      ? Math.min(9999, Math.max(1, Math.trunc(rawQuantity)))
      : 1;

    if (!productId && sku) {
      productId = (await resolveProductIdBySku(sku)) ?? 0;
    }

    if (!productId) {
      return Response.json(
        { message: "A valid product is required." },
        { status: 400 }
      );
    }

    const bootstrapResponse = await fetchStoreCart(request);

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/wc/store/v1/cart/add-item`,
      {
        method: "POST",
        headers: buildWcStoreHeaders(request, true, bootstrapResponse),
        body: JSON.stringify({
          id: productId,
          quantity,
        }),
        cache: "no-store",
      }
    );

    return buildStoreCartMutationResponse(
      wpResponse,
      "Item added to your order."
    );
  } catch (error) {
    console.error("Cart POST proxy error:", error);
    return Response.json({ message: "Add to cart failed." }, { status: 500 });
  }
}
