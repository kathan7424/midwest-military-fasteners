/**
 * File Name: route.ts
 * Description: POST proxy — after the browser confirms a card SetupIntent,
 *   register the Stripe PM as a WC payment token (WC Stripe standard: cards
 *   live in the WC token table, which checkout and the account panel read).
 *   Ownership is verified in WP against the user's Stripe customer.
 * Developer: KP-184
 * Created Date: 2026-07-16
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";

async function getCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { pm_id?: string };
  const pm_id = typeof body.pm_id === "string" ? body.pm_id : "";

  if (!/^pm_[a-zA-Z0-9]+$/.test(pm_id)) {
    return NextResponse.json({ message: "Invalid payment method ID." }, { status: 400 });
  }

  const cookie_header = await getCookieHeader();

  const response = await fetch(
    `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/payment-methods/finalize`,
    {
      method: "POST",
      headers: {
        ...buildWpCookieHeader(cookie_header || null),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pm_id }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    }
  );

  const data = await response.json().catch(() => ({}));
  const res = NextResponse.json(data, { status: response.status });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
