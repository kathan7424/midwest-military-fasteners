/**
 * File Name: route.ts
 * Description: Proxy for changing the account password.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import {
  buildProxiedResponse,
  buildWpCookieHeader,
} from "@/utils/auth-proxy.utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookie_store = await cookies();
    const cookie_header = cookie_store
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const body = await request.json();

    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/account/password`,
      {
        method: "POST",
        headers: {
          ...buildWpCookieHeader(cookie_header || null),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    return buildProxiedResponse(response);
  } catch (error) {
    console.error("Password change proxy error:", error);
    return NextResponse.json(
      { message: "Password change failed." },
      { status: 500 }
    );
  }
}
