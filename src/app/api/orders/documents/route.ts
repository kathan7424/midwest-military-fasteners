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

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookie_store = await cookies();
    const cookie_header = cookie_store
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    // The WP endpoint walks every order × line item × product meta for the
    // customer — give it a generous window but never hang the route.
    const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/orders/documents`, {
      method: "GET",
      headers: buildWpCookieHeader(cookie_header || null),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      console.error(
        `[order-documents] WP fetch failed: status=${response.status}`,
        data && typeof data === "object" && "code" in data ? `code=${(data as { code?: string }).code}` : "(unparseable body)"
      );
      return NextResponse.json(
        { message: "Order documents fetch failed." },
        { status: response.status || 502 }
      );
    }

    const res = NextResponse.json(data, { status: response.status });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Order documents proxy error:", error);
    return NextResponse.json(
      { message: "Order documents fetch failed." },
      { status: 500 }
    );
  }
}
