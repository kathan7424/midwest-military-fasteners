/**
 * File Name: route.ts
 * Description: Proxy for saved Stripe payment methods.
 *   GET  — list saved cards for the current customer.
 *   POST — create a Stripe SetupIntent (client_secret returned to frontend).
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

async function getCookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export async function GET() {
  const cookie_header = await getCookieHeader();

  const response = await fetch(
    `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/payment-methods`,
    {
      method: "GET",
      headers: buildWpCookieHeader(cookie_header || null),
      cache: "no-store",
    }
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST() {
  const cookie_header = await getCookieHeader();

  const response = await fetch(
    `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/payment-methods`,
    {
      method: "POST",
      headers: buildWpCookieHeader(cookie_header || null),
      cache: "no-store",
    }
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
