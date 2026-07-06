/**
 * File Name: auth.service.ts
 * Description: Server-side auth state helpers.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-06-25
 */

import { cookies } from "next/headers";

/**
 * Returns true when a WordPress/WooCommerce session cookie is present.
 */
export async function isUserLoggedIn(): Promise<boolean> {
  const cookieStore = await cookies();

  return cookieStore.getAll().some((cookie) =>
    cookie.name.startsWith("wordpress_logged_in_")
  );
}
