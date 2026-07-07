/**
 * File Name: auth-proxy.utils.ts
 * Description: Helpers for proxying WordPress auth responses and cookies.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextResponse } from "next/server";

/**
 * Build a Next.js response from a WordPress fetch, forwarding Set-Cookie headers.
 */
export async function buildProxiedResponse(
  wpResponse: Response
): Promise<NextResponse> {
  const data = await wpResponse.json().catch(() => ({}));

  const response = NextResponse.json(data, { status: wpResponse.status });

  wpResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("set-cookie", value);
    }
  });

  return response;
}

/**
 * Forward browser cookies to WordPress for authenticated requests.
 */
export function buildWpCookieHeader(cookieHeader: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  return headers;
}
