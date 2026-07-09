/**
 * File Name: route.ts
 * Description: Cached categories proxy for client-side catalog warmup.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { NextResponse } from "next/server";

import { get_cached_spec_parts_categories } from "@/services/catalog-data.service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const categories = await get_cached_spec_parts_categories();

    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Catalog categories API error:", error);

    return NextResponse.json(
      { error: "Categories fetch failed." },
      { status: 500 }
    );
  }
}
