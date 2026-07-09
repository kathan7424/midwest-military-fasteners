/**
 * File Name: route.ts
 * Description: Proxy logout to WordPress.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import {
  buildProxiedResponse,
  buildWpCookieHeader,
} from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const wpResponse = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/logout`, {
      method: "POST",
      headers: buildWpCookieHeader(request.headers.get("cookie")),
      cache: "no-store",
    });

    // Clear the WC cart session — otherwise the next login sees this user's cart.
    return buildProxiedResponse(wpResponse, { clearWcSession: true });
  } catch (error) {
    console.error("Logout proxy error:", error);

    return Response.json({ message: "Logout failed." }, { status: 500 });
  }
}
