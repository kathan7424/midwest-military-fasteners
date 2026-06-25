/**
 * File Name: route.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { NextResponse } from "next/server";

import { fetchMenu } from "@/services/menu.service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET() {
  try {
    const menu = await fetchMenu();

    return NextResponse.json(menu, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Menu API Error:", error);

    return NextResponse.json({ error: "Menu fetch failed" }, { status: 500 });
  }
}
