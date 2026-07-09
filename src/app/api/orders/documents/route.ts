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
  try {
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
  } catch (error) {
    console.error("Order documents proxy error:", error);
    return NextResponse.json(
      { message: "Order documents fetch failed." },
      { status: 500 }
    );
  }
}
