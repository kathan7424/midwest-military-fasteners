/**
 * File Name: route.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { NextResponse } from "next/server";

import { fetchMenu } from "@/services/menu.service";

// Menu is public, identical for every visitor, and changes only when an admin
// edits it — cache 5 min (dev stays fresh) instead of hitting WP per request.
// dynamic stays on so the route runs per request; the WP fetch inside
// fetchMenu is ISR-cached (fetchWpJson mode: "static") across requests.
export const dynamic = "force-dynamic";

const IS_DEV = process.env.NODE_ENV === "development";

export async function GET() {
  try {
    const menu = await fetchMenu();

    return NextResponse.json(menu, {
      headers: {
        "Cache-Control": IS_DEV
          ? "no-store"
          : "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Menu API Error:", error);

    return NextResponse.json({ error: "Menu fetch failed" }, { status: 500 });
  }
}
