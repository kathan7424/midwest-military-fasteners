/**
 * File Name: route.ts
 * Description: Proxy password reset requests to WordPress auth endpoint.
 * Developer: KP-184
 * Created Date: 2026-07-14
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import { buildProxiedResponse } from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const forwardedFor = request.headers.get("x-forwarded-for");

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}),
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    return buildProxiedResponse(wpResponse);
  } catch (error) {
    console.error("Reset password proxy error:", error);

    return Response.json(
      { message: "Password reset failed." },
      { status: 500 }
    );
  }
}
