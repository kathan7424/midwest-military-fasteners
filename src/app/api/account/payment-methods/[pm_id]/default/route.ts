/**
 * File Name: route.ts
 * Description: POST proxy — set a saved card as the default payment method
 *   (WC-standard: the default token is preselected at checkout). pm_id here
 *   is the WC payment token integer ID; ownership is verified in WP.
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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pm_id: string }> }
) {
  const { pm_id } = await params;

  // Default-card route uses the WC token integer ID, not the Stripe pm_ ID.
  if (!/^\d+$/.test(pm_id)) {
    return NextResponse.json({ message: "Invalid payment method ID." }, { status: 400 });
  }

  const cookie_header = await getCookieHeader();

  const response = await fetch(
    `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/payment-methods/${encodeURIComponent(pm_id)}/default`,
    {
      method: "POST",
      headers: buildWpCookieHeader(cookie_header || null),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({}));
  const res = NextResponse.json(data, { status: response.status });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
