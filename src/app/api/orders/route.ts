/**
 * File Name: route.ts
 * Description: Proxy for the customer's order history.
 * Developer: KP-184
 * Created Date: 2026-07-08
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

    const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/orders`, {
      method: "GET",
      headers: buildWpCookieHeader(cookie_header || null),
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Orders proxy error:", error);
    return NextResponse.json(
      { message: "Orders fetch failed." },
      { status: 500 }
    );
  }
}
