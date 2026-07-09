/**
 * File Name: route.ts
 * Description: Proxy WooCommerce allowed countries/states for checkout dropdowns.
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import { NextResponse } from "next/server";

import { ENV } from "@/config/env";

// Dev: always fresh so WC setting changes reflect instantly.
// Prod: 5-min ISR — admin changes selling countries rarely.
const IS_DEV = process.env.NODE_ENV === "development";

export async function GET() {
  try {
    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/checkout/locations`,
      {
        ...(IS_DEV ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
        headers: { Accept: "application/json" },
      }
    );

    if (!wpResponse.ok) {
      return NextResponse.json(
        { message: "Locations unavailable." },
        { status: wpResponse.status }
      );
    }

    const data = await wpResponse.json();
    const response = NextResponse.json(data);
    response.headers.set(
      "Cache-Control",
      IS_DEV
        ? "no-store"
        : "public, max-age=300, stale-while-revalidate=3600"
    );

    return response;
  } catch (error) {
    console.error("Checkout locations proxy error:", error);
    return NextResponse.json({ message: "Locations unavailable." }, { status: 500 });
  }
}
