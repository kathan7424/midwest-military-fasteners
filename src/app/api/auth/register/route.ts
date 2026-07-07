/**
 * File Name: route.ts
 * Description: Proxy registration to WordPress Gravity Forms submit endpoint.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import { buildProxiedResponse } from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/register`,
      {
        method: "POST",
        body: formData,
        cache: "no-store",
      }
    );

    return buildProxiedResponse(wpResponse);
  } catch (error) {
    console.error("Register proxy error:", error);

    return Response.json({ message: "Registration failed." }, { status: 500 });
  }
}
