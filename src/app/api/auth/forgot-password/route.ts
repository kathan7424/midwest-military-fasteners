/**
 * File Name: route.ts
 * Description: Proxy forgot password requests to WordPress auth endpoint.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import { buildProxiedResponse } from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    return buildProxiedResponse(wpResponse);
  } catch (error) {
    console.error("Forgot password proxy error:", error);

    return Response.json(
      { message: "Forgot password request failed." },
      { status: 500 }
    );
  }
}
