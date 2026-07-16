/**
 * File Name: route.ts
 * Description: Post-3DS payment verification proxy for WC Stripe.
 *   After the browser completes a 3DS challenge via stripe.confirmCardPayment,
 *   classic WooCommerce redirects to {wp}/?wc-api=wc_stripe_verify_intent so
 *   the gateway confirms the PaymentIntent result and marks the order paid
 *   immediately. Headless checkout skips that full-page redirect, so this
 *   route performs the same GET server-side. Without it, 3DS orders stay
 *   "pending" until the Stripe webhook arrives.
 *
 *   Non-fatal by design: the webhook is the fallback, so failures return 200
 *   with verified:false rather than surfacing an error to the shopper.
 * Developer: KP-184
 * Created Date: 2026-07-16
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// WP nonce: 10 lowercase hex chars (wp_create_nonce output).
const WP_NONCE_RE = /^[a-f0-9]{8,12}$/i;

/**
 * Extract the wc_stripe_verify_intent nonce from a WC Stripe confirm hash.
 * Formats seen across plugin versions:
 *   #wc-stripe-confirm-pi:{order_id}:{pi_..._secret_...}:{nonce}
 *   #confirm-pi:{pi_..._secret_...}:{encoded-verify-url}
 */
function extractVerifyTarget(
  redirectUrl: string,
  orderId: number
): string | null {
  const hashIndex = redirectUrl.indexOf("#");
  if (hashIndex === -1) return null;

  const segments = redirectUrl.slice(hashIndex + 1).split(":");
  const secretIndex = segments.findIndex((segment) =>
    /^(pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(segment)
  );
  if (secretIndex === -1) return null;

  for (const segment of segments.slice(secretIndex + 1)) {
    // Older format: the segment after the secret is a URL-encoded verify URL.
    const decoded = decodeURIComponent(segment);
    if (decoded.startsWith(ENV.WP_SITE_URL)) {
      return decoded;
    }

    // Newer format: the segment is a bare WP nonce — build the verify URL.
    if (WP_NONCE_RE.test(segment)) {
      const url = new URL(ENV.WP_SITE_URL);
      url.searchParams.set("wc-api", "wc_stripe_verify_intent");
      url.searchParams.set("order", String(orderId));
      url.searchParams.set("nonce", segment);
      return url.toString();
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      redirect_url?: string;
      order_id?: number;
    };

    const redirectUrl = typeof body.redirect_url === "string" ? body.redirect_url : "";
    const orderId = Number(body.order_id) || 0;

    if (!redirectUrl || !orderId) {
      return Response.json({ verified: false }, { status: 200 });
    }

    const target = extractVerifyTarget(redirectUrl, orderId);
    if (!target) {
      return Response.json({ verified: false }, { status: 200 });
    }

    // GET the WP verify endpoint. It responds with a redirect to the
    // order-received page on success — we only care that it executed.
    const wpResponse = await fetch(target, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const verified = wpResponse.status < 400;
    return Response.json({ verified }, { status: 200 });
  } catch {
    // Webhook fallback covers this — never fail the shopper's success flow.
    return Response.json({ verified: false }, { status: 200 });
  }
}
