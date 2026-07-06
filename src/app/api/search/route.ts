/**
 * File Name: route.ts
 * Description: Internal proxy for WordPress product search API.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest, NextResponse } from "next/server";

import { fetchSearchResults } from "@/services/search.service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({
      query: "",
      posts: [],
      terms: [],
      total: { posts: 0, terms: 0 },
    });
  }

  try {
    const results = await fetchSearchResults(query);

    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Search API Error:", error);

    return NextResponse.json({ error: "Search fetch failed" }, { status: 500 });
  }
}
