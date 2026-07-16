/**
 * File Name: route.ts
 * Description: Proxy for single order detail (My Account → View Order).
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order_id = id.replace(/\D/g, "");

    if (!order_id) {
      return NextResponse.json(
        { message: "Invalid order ID." },
        { status: 400 }
      );
    }

    const cookie_store = await cookies();
    const cookie_header = cookie_store
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/orders/${order_id}`,
      {
        method: "GET",
        headers: buildWpCookieHeader(cookie_header || null),
        cache: "no-store",
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Order detail proxy error:", error);
    return NextResponse.json(
      { message: "Order detail fetch failed." },
      { status: 500 }
    );
  }
}
