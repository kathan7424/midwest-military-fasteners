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
  persistStoreSessionCookies,
  sanitizeCertOptInMap,
  wcStoreMutation,
} from "@/utils/wc-cart-proxy.utils";
import { formatNoticeMessage } from "@/utils/text.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// TEMP DIAGNOSTIC — appends to a local file so the cert opt-in capture chain
// is traceable without needing terminal access to whatever process is
// running `next dev`. Remove once the live cert-opt-in bug is confirmed fixed.
async function debugCertOptInLog(step: string, data: unknown): Promise<void> {
  try {
    const fs = await import("fs/promises");
    const line = `${new Date().toISOString()} [${step}] ${JSON.stringify(data)}\n`;
    await fs.appendFile("cert-optin-debug.log", line);
  } catch {
    // Never let diagnostic logging break checkout.
  }
}

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

    const checkoutPayload = {
      billing_address: billingForWc,
      shipping_address: shippingForWc,
      payment_method: body.payment_method,
      payment_data: body.payment_data ?? [],
      customer_note: (body.customer_note ?? "").slice(0, 1000),
      create_account: body.create_account === true,
    };

    const certOptIn = sanitizeCertOptInMap(body.cert_opted_in);

    // TEMP DIAGNOSTIC — tracing a live bug where a confirmed-correct
    // client payload (cert_opted_in present, real cert file, checkbox
    // checked) still never reaches WC as _mmf_cert_opted_in on the order.
    // Remove once the root cause is confirmed.
    void debugCertOptInLog("request received", {
      body_cert_opted_in: body.cert_opted_in,
      sanitized_certOptIn: certOptIn,
    });

    // Pass cert opt-in selections as Store API extension data so the
    // mmf_cert update_callback can save them to WC session before order
    // line items are created.
    let wpResponse = await wcStoreMutation(request, "checkout", {
      ...checkoutPayload,
      ...(certOptIn
        ? { extensions: { mmf_cert: { cert_opted_in: certOptIn } } }
        : {}),
    });

    let raw = (await wpResponse.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    void debugCertOptInLog("first wcStoreMutation attempt", {
      sent_extensions: certOptIn ? { mmf_cert: { cert_opted_in: certOptIn } } : null,
      status: wpResponse.status,
      raw_message: raw?.message,
      raw_extensions_in_response: ( raw as Record<string, unknown> | null )?.extensions,
    });

    // If WP rejects the extensions parameter (mmf_cert namespace not yet
    // registered server-side), retry once WITHOUT extensions. Safe: a 400
    // param-validation rejection happens before any order is created, so no
    // duplicate-order risk — the order just goes through without the opt-in.
    if (
      certOptIn &&
      wpResponse.status === 400 &&
      typeof raw?.message === "string" &&
      /extensions/i.test(raw.message)
    ) {
      console.warn(
        "[checkout] WP rejected extensions.mmf_cert (extension not deployed?) — retrying without cert opt-in"
      );
      void debugCertOptInLog("RETRYING WITHOUT EXTENSIONS — cert opt-in dropped here", {
        rejection_message: raw.message,
      });
      wpResponse = await wcStoreMutation(request, "checkout", checkoutPayload);
      raw = (await wpResponse.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
    }

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
    // Forward WC session cookies rotated after order placement. Use
    // getSetCookie() so multiple Set-Cookie headers aren't merged.
    const h = wpResponse.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies =
      typeof h.getSetCookie === "function"
        ? h.getSetCookie()
        : (wpResponse.headers.get("set-cookie") ?? "").split(/,(?=[^ ])/);
    for (const c of setCookies) {
      if (c.trim()) response.headers.append("set-cookie", c.trim());
    }
    // Checkout also rotates the Store API Nonce/Cart-Token response headers
    // to the new (now-empty) cart — without persisting these, the browser
    // keeps sending the pre-order cart-token on the next cart fetch and the
    // just-purchased item appears to still be "in the cart" after checkout.
    persistStoreSessionCookies(wpResponse, response);
    return response;
  } catch (error) {
    console.error("Checkout POST proxy error:", error);
    return Response.json({ message: "Order could not be placed." }, { status: 500 });
  }
}
