/**
 * File Name: route.ts
 * Description: Proxy checkout to WooCommerce Store API.
 *   GET  → current cart + checkout state (totals, rates, saved addresses)
 *   POST → place the order (Stripe payment method id in payment_data)
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import { NextRequest, NextResponse } from "next/server";

import {
  buildCheckoutCartStateResponse,
  fetchStoreCartWithRecovery,
  wcStoreMutation,
} from "@/utils/wc-cart-proxy.utils";
import { formatNoticeMessage } from "@/utils/text.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// WC Store API rejects unknown keys (additionalProperties: false in WC 9+).
// billing includes email; shipping never does.
const WC_BILLING_KEYS = ["first_name","last_name","company","address_1","address_2","city","state","postcode","country","phone","email"] as const;
const WC_SHIPPING_KEYS = ["first_name","last_name","company","address_1","address_2","city","state","postcode","country","phone"] as const;

// Optional address fields — skip them entirely when blank so WC validators
// never receive an empty string for a field the customer didn't fill in.
const WC_ADDRESS_OPTIONAL = new Set(["company", "address_2", "phone"]);

function pickWcAddress(
  addr: Record<string, string>,
  isBilling: boolean
): Record<string, string> {
  const keys = isBilling ? WC_BILLING_KEYS : WC_SHIPPING_KEYS;
  const out: Record<string, string> = {};
  for (const k of keys) {
    if (!(k in addr)) continue;
    const v = addr[k] ?? "";
    if (v === "" && WC_ADDRESS_OPTIONAL.has(k)) continue;
    out[k] = v;
  }
  return out;
}

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
      payment_data?: Array<{ key: string; value: string }>;
      customer_note?: string;
      create_account?: boolean;
      cert_opted_in?: Record<string, boolean>;
    };

    if (!body.billing_address || !body.payment_method) {
      return Response.json(
        { message: "Billing address and payment method are required." },
        { status: 400 }
      );
    }

    // WC Store API schema is strict: shipping_address never includes email;
    // billing_address and shipping_address must only contain WC-known keys.
    const billingForWc = pickWcAddress(body.billing_address, true);
    const shippingForWc = pickWcAddress(
      body.shipping_address ?? body.billing_address,
      false
    );

    const wpResponse = await wcStoreMutation(request, "checkout", {
      billing_address: billingForWc,
      shipping_address: shippingForWc,
      payment_method: body.payment_method,
      payment_data: body.payment_data ?? [],
      customer_note: (body.customer_note ?? "").slice(0, 1000),
      create_account: body.create_account === true,
      // Pass cert opt-in selections as Store API extension data so the
      // mmf_cert update_callback can save them to WC session before order
      // line items are created.
      ...(body.cert_opted_in && Object.keys(body.cert_opted_in).length > 0
        ? { extensions: { mmf_cert: { cert_opted_in: body.cert_opted_in } } }
        : {}),
    });

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
    // Forward any WC session cookies rotated after order placement
    // (e.g. WC clears the cart session and issues a fresh nonce).
    wpResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        response.headers.append("set-cookie", value);
      }
    });
    return response;
  } catch (error) {
    console.error("Checkout POST proxy error:", error);
    return Response.json({ message: "Order could not be placed." }, { status: 500 });
  }
}
