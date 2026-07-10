/**
 * File Name: route.ts
 * Description: Proxy for spec-parts product catalog search (client-side table).
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { NextRequest, NextResponse } from "next/server";

import { fetch_spec_parts_products } from "@/services/spec-parts.service";

export const dynamic = "force-dynamic";
// NOTE: no fetchCache override here — fetch_spec_parts_products relies on
// fetchWpJson's 60s ISR per unique query. force-no-store would disable that
// and send every filter keystroke on a full WP roundtrip (~0.3–2s each).

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const products = await fetch_spec_parts_products({
      search: params.get("search") ?? undefined,
      sku: params.get("sku") ?? undefined,
      category: params.get("category") ?? undefined,
      series: params.get("series") ?? undefined,
      per_page: Number(params.get("per_page")) || 10,
      page: Number(params.get("page")) || 1,
    });

    // Catalog data is identical for every visitor — let the browser/CDN
    // reuse it briefly and refresh in the background.
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Catalog products API error:", error);

    return NextResponse.json({ error: "Product search failed." }, { status: 500 });
  }
}
