/**
 * File Name: auth.service.ts
 * Description: Server-side auth state helpers and route guards.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-07-06
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ENV } from "@/config/env";
import { PUBLIC_ROUTES } from "@/config/routes";
import { AuthMeResponse } from "@/types/auth.types";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

const WP_LOGGED_IN_COOKIE_PREFIX = "wordpress_logged_in_";

/**
 * Returns true when a WordPress/WooCommerce session cookie is present.
 */
export async function isUserLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies();

  return cookieStore.getAll().some((cookie) =>
    cookie.name.startsWith(WP_LOGGED_IN_COOKIE_PREFIX)
  );
}

/**
 * Redirect to login when the user is not authenticated.
 */
export async function requireAuth(returnPath?: string): Promise<void> {
  const loggedIn = await isUserLoggedIn();

  if (!loggedIn) {
    const loginPath = returnPath
      ? `${PUBLIC_ROUTES.login}?redirect=${encodeURIComponent(returnPath)}`
      : PUBLIC_ROUTES.login;

    redirect(loginPath);
  }
}

/**
 * Redirect authenticated users away from guest-only pages.
 */
export async function requireGuest(): Promise<void> {
  const loggedIn = await isUserLoggedIn();

  if (loggedIn) {
    redirect(PUBLIC_ROUTES.home);
  }
}

/**
 * Fetch the current user from WordPress when session cookies are present.
 */
export async function getCurrentUser() {
  const loggedIn = await isUserLoggedIn();

  if (!loggedIn) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  try {
    const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/me`, {
      method: "GET",
      headers: buildWpCookieHeader(cookieHeader || null),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as AuthMeResponse;
    return data.user;
  } catch {
    return null;
  }
}
