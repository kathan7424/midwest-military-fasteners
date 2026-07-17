/**
 * File Name: proxy.ts
 * Description: Auth guard — protects routes and redirects guest/auth users.
 *   Next.js 16 proxy convention (renamed from middleware.ts).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-17
 */

import { NextRequest, NextResponse } from "next/server";

import {
  GUEST_ONLY_ROUTES,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  matchesRoutePrefix,
} from "@/config/routes";

const WP_LOGGED_IN_COOKIE_PREFIX = "wordpress_logged_in_";

function isLoggedIn(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(WP_LOGGED_IN_COOKIE_PREFIX));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = isLoggedIn(request);
  const isGuestRoute = matchesRoutePrefix(pathname, GUEST_ONLY_ROUTES);
  const isProtectedRoute = matchesRoutePrefix(pathname, PROTECTED_ROUTES);

  if (isGuestRoute && loggedIn) {
    return NextResponse.redirect(new URL(PUBLIC_ROUTES.home, request.url));
  }

  if (isProtectedRoute && !loggedIn) {
    const loginUrl = new URL(PUBLIC_ROUTES.login, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/forgot-password",
    "/my-account/:path*",
    // /cart is intentionally NOT protected here — WooCommerce always allows
    // guests to view their cart. Checkout guest access is controlled by the
    // WC "Allow customers to place orders without an account" setting and
    // enforced in checkout/page.tsx, not in the proxy.
  ],
};
