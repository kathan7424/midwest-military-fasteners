/**
 * File Name: route.ts
 * Description: Proxy for the customer's saved WC billing/shipping addresses.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";

function buildCookieHeader(cookie_store: Awaited<ReturnType<typeof cookies>>): string {
  return cookie_store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function GET() {
  const cookie_store = await cookies();
  const cookie_header = buildCookieHeader(cookie_store);

  const response = await fetch(
    `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/addresses`,
    {
      method: "GET",
      headers: buildWpCookieHeader(cookie_header || null),
      cache: "no-store",
    }
  );

  const data = await response.json();
  const res = NextResponse.json(data, { status: response.status });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export async function POST(request: NextRequest) {
  try {
    const cookie_store = await cookies();
    const cookie_header = buildCookieHeader(cookie_store);
    const body = await request.json();

    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/addresses`,
      {
        method: "POST",
        headers: {
          ...buildWpCookieHeader(cookie_header || null),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const data = await response.json();
    const res = NextResponse.json(data, { status: response.status });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Address update proxy error:", error);
    return NextResponse.json(
      { message: "Address update failed." },
      { status: 500 }
    );
  }
}
