/**
 * File Name: auth-proxy.utils.ts
 * Description: Helpers for proxying WordPress auth responses and cookies.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextResponse } from "next/server";

export const WC_STORE_NONCE_COOKIE = "wc_store_nonce";
export const WC_CART_TOKEN_COOKIE = "wc_cart_token";

/**
 * Append a Set-Cookie header WITHOUT going through response.cookies.
 *
 * NextResponse.cookies.set/delete re-serializes its own cookie jar and
 * CLOBBERS manually-appended set-cookie headers (e.g. WordPress login/logout
 * cookies we forward). Raw header appends compose safely.
 */
export function appendSetCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: { expire?: boolean } = {}
): void {
  // 172800s = 48 hours — matches WooCommerce's default session lifetime so the
  // guest cart survives a browser restart (WC standard behaviour).
  let attributes = options.expire
    ? "Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax"
    : "Path=/; HttpOnly; SameSite=Lax; Max-Age=172800";

  // Secure in production only — local dev serves over plain http.
  if (process.env.NODE_ENV === "production") {
    attributes += "; Secure";
  }

  response.headers.append("set-cookie", `${name}=${value}; ${attributes}`);
}

/**
 * Remove the WooCommerce Store API session cookies.
 *
 * The cart token identifies a WC session independent of the WP login cookie —
 * if it survives a logout/login, the next user is served the PREVIOUS user's
 * cart. Always call this on auth transitions.
 */
export function clearWcSessionCookies(response: NextResponse): void {
  appendSetCookie(response, WC_CART_TOKEN_COOKIE, "", { expire: true });
  appendSetCookie(response, WC_STORE_NONCE_COOKIE, "", { expire: true });
}

/**
 * Forward every Set-Cookie header from a WP response individually.
 *
 * Headers.prototype.forEach combines multiple Set-Cookie values into one
 * comma-joined string, which corrupts cookies whose own value contains a
 * comma (every cookie's Expires attribute does: "Expires=Thu, 21-Aug-2026...").
 * getSetCookie() (WHATWG Fetch / Node.js 18.14+) returns each header
 * separately — critical here since login/logout can set several cookies
 * (WP auth cookie pair + WC session cookies) in the same response.
 */
function forwardSetCookieHeaders(from: Response, to: NextResponse): void {
  const h = from.headers as Headers & { getSetCookie?: () => string[] };
  const cookies =
    typeof h.getSetCookie === "function"
      ? h.getSetCookie()
      : (from.headers.get("set-cookie") ?? "").split(/,(?=[^ ])/);
  for (const c of cookies) {
    if (c.trim()) to.headers.append("set-cookie", c.trim());
  }
}

/**
 * Build a Next.js response from a WordPress fetch, forwarding Set-Cookie headers.
 */
export async function buildProxiedResponse(
  wpResponse: Response,
  options: { clearWcSession?: boolean } = {}
): Promise<NextResponse> {
  const data = await wpResponse.json().catch(() => ({}));

  const response = NextResponse.json(data, { status: wpResponse.status });

  forwardSetCookieHeaders(wpResponse, response);

  if (options.clearWcSession) {
    clearWcSessionCookies(response);
  }

  return response;
}

/**
 * Forward browser cookies to WordPress for authenticated requests.
 *
 * X-MMF-Proxy marks the request as coming from our server-side proxy — WP
 * uses it to allow cookie auth without an X-WP-Nonce (see
 * mmf_headless_cookie_auth). Browsers can't forge it cross-origin. The value
 * is a server-only shared secret (MMF_PROXY_SECRET) so requests that reach WP
 * directly can't spoof the header.
 */
export function buildWpCookieHeader(cookieHeader: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-MMF-Proxy": process.env.MMF_PROXY_SECRET || "1",
  };

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  return headers;
}
