/**
 * File Name: route.ts
 * Description: Proxy login to WordPress wp_signon endpoint.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import { buildProxiedResponse } from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward the real client IP so WP-side rate limiting doesn't see every
    // login as coming from this server.
    const forwardedFor = request.headers.get("x-forwarded-for");

    const wpResponse = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    // Drop any pre-login WC cart session token so this user gets their OWN
    // cart (WooCommerce merges/loads the customer cart from the login cookie).
    return buildProxiedResponse(wpResponse, { clearWcSession: true });
  } catch (error) {
    console.error("Login proxy error:", error);

    return Response.json({ message: "Login failed." }, { status: 500 });
  }
}
