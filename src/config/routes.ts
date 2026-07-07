/**
 * File Name: routes.ts
 * Description: Central app route definitions for pages and API.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

/** Public website pages — no login required */
export const PUBLIC_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  productListing: "/product",
  productDetail: (series: string, partNumber: string) =>
    `/product/${series}/${partNumber}`,
  cmsPage: (slug: string) => `/${slug}`,
} as const;

/** Guest-only pages — logged-in users are redirected away */
export const GUEST_ONLY_ROUTES = ["/login", "/register"] as const;

/** Protected pages — login required */
export const PROTECTED_ROUTES = ["/my-account", "/cart"] as const;

/** Next.js API proxy routes */
export const API_ROUTES = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    register: "/api/auth/register",
    me: "/api/auth/me",
  },
  menu: "/api/menu",
  search: "/api/search",
  cart: "/api/cart",
  cartRemove: "/api/cart/remove",
} as const;

/** WordPress custom REST endpoints */
export const WP_ROUTES = {
  login: "/wp-json/custom/v1/auth/login",
  logout: "/wp-json/custom/v1/auth/logout",
  register: "/wp-json/custom/v1/auth/register",
  me: "/wp-json/custom/v1/auth/me",
  cart: "/wp-json/custom/v1/cart",
  cartRemove: "/wp-json/custom/v1/cart/remove",
  homePage: "/wp-json/custom/v1/home-page",
  productCatalog: "/wp-json/custom/v1/product-catalog",
  search: "/wp-json/custom/v1/search",
  siteSettings: "/wp-json/custom/v1/site-settings",
  menu: (location: string) => `/wp-json/custom/v1/menu/${location}`,
} as const;

/**
 * Returns true when pathname matches a route prefix list.
 */
export function matchesRoutePrefix(
  pathname: string,
  routes: readonly string[]
): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}
