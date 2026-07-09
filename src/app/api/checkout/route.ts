/**
 * File Name: route.ts
 * Description: Proxy checkout to WooCommerce Store API.
 *   GET  → current cart + checkout state (totals, rates, saved addresses)
 *   POST → place the order (Stripe payment method id in payment_data)
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import {
  buildCheckoutCartStateResponse,
  buildWcStoreHeaders,
  fetchStoreCart,
  fetchStoreCartWithRecovery,
} from "@/utils/wc-cart-proxy.utils";
import { formatNoticeMessage } from "@/utils/text.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    const wpResponse = await fetchStoreCartWithRecovery(request);
    return buildCheckoutCartStateResponse(wpResponse);
  } catch (error) {
    console.error("Checkout GET proxy error:", error);
    return Response.json({ message: "Checkout load failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      billing_address?: Record<string, string>;
      shipping_address?: Record<string, string>;
      payment_method?: string;
      payment_data?: Array<{ key: string; value: string | boolean }>;
      customer_note?: string;
    };

    if (!body.billing_address || !body.payment_method) {
      return Response.json(
        { message: "Billing address and payment method are required." },
        { status: 400 }
      );
    }

    const bootstrapResponse = await fetchStoreCart(request);

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/wc/store/v1/checkout`,
      {
        method: "POST",
        headers: buildWcStoreHeaders(request, true, bootstrapResponse),
        body: JSON.stringify({
          billing_address: body.billing_address,
          shipping_address: body.shipping_address ?? body.billing_address,
          payment_method: body.payment_method,
          payment_data: body.payment_data ?? [],
          customer_note: body.customer_note ?? "",
        }),
        cache: "no-store",
      }
    );

    const raw = (await wpResponse.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!wpResponse.ok || !raw) {
      const message = formatNoticeMessage(
        typeof raw?.message === "string" ? raw.message : "Order could not be placed."
      );

      return NextResponse.json(
        { message, code: raw?.code },
        { status: wpResponse.status || 500 }
      );
    }

    const response = NextResponse.json(raw, { status: wpResponse.status });
    response.headers.set("Cache-Control", "no-store, private");
    return response;
  } catch (error) {
    console.error("Checkout POST proxy error:", error);
    return Response.json({ message: "Order could not be placed." }, { status: 500 });
  }
}
