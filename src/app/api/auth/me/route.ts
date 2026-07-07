/**
 * File Name: route.ts
 * Description: Proxy current user check to WordPress.
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

export async function GET(request: NextRequest) {
  try {
    const wpResponse = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/me`, {
      method: "GET",
      headers: buildWpCookieHeader(request.headers.get("cookie")),
      cache: "no-store",
    });

    return buildProxiedResponse(wpResponse);
  } catch (error) {
    console.error("Auth me proxy error:", error);

    return Response.json({ message: "Auth check failed." }, { status: 500 });
  }
}
