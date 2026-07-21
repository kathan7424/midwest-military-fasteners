/**
 * File Name: route.ts
 * Description: Internal proxy for WordPress global search API.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest, NextResponse } from "next/server";

import { fetchSearchResults } from "@/services/search.service";

// No fetchCache override here — the search service uses a per-query 30s
// micro-cache (fetchWpJson revalidate:30) and force-no-store would defeat it.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Cap query length — WP search gains nothing past this and long strings
  // are a cheap way to hammer the backend.
  const query = (request.nextUrl.searchParams.get("q")?.trim() ?? "").slice(
    0,
    100
  );
  const scope =
    request.nextUrl.searchParams.get("scope") === "catalog"
      ? "catalog"
      : "global";

  if (!query) {
    return NextResponse.json({
      query: "",
      posts: [],
      terms: [],
      total: { posts: 0, terms: 0 },
    });
  }

  try {
    const results = await fetchSearchResults(query, 15, scope);

    // Public catalog search — identical for every visitor. A short shared
    // cache absorbs repeated suggestion lookups while staying fresh.
    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch {
    // One retry — a cold Pantheon dev backend or a momentary blip fails the
    // first request often enough that it's worth a single extra attempt
    // before giving up.
    try {
      const results = await fetchSearchResults(query, 15, scope);
      return NextResponse.json(results, {
        headers: {
          "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
        },
      });
    } catch (error) {
      console.error("Search API Error:", error);

      // Suggestions are cosmetic — a failed lookup should show "no results",
      // never a console error. Degrade to an empty response instead of 500.
      return NextResponse.json({
        query,
        posts: [],
        terms: [],
        total: { posts: 0, terms: 0 },
      });
    }
  }
}
