/**
 * File Name: route.ts
 * Description: Proxy for post-purchase product document downloads.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

export async function GET() {
  const cookie_store = await cookies();
  const cookie_header = cookie_store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/orders/documents`, {
    method: "GET",
    headers: buildWpCookieHeader(cookie_header || null),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
