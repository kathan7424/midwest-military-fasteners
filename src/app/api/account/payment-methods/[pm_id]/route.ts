/**
 * File Name: route.ts
 * Description: DELETE proxy — detach a saved Stripe payment method.
 *   Ownership is verified server-side (WP checks Stripe customer match).
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

async function getCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ pm_id: string }> }
) {
  const { pm_id } = await params;

  // Basic format check before forwarding — pm_* only
  if (!/^pm_[a-zA-Z0-9]+$/.test(pm_id)) {
    return NextResponse.json({ message: "Invalid payment method ID." }, { status: 400 });
  }

  const cookie_header = await getCookieHeader();

  const response = await fetch(
    `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/payment-methods/${encodeURIComponent(pm_id)}`,
    {
      method: "DELETE",
      headers: buildWpCookieHeader(cookie_header || null),
      cache: "no-store",
    }
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
