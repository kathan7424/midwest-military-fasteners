/**
 * File Name: routes.ts
 * Description: Central app route definitions for pages and API.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

/** Public website pages — no login required */
export const PUBLIC_ROUTES = {
  home: "/",
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  register: "/register",
  cart: "/cart",
  myAccount: "/my-account",
  productListing: "/product",
  productCategory: "/product-category",
  /** Resolved at runtime from WooCommerce Shop page via site-settings API. */
  getCatalogListingPath: (shopPagePath?: string) =>
    shopPagePath?.trim() ? shopPagePath.replace(/\/+$/, "") || "/product" : "/product",
  productDetail: (slug: string) => `/product/${encodeURIComponent(slug)}`,
  productCategoryPath: (...segments: string[]) =>
    `/product-category/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`,
  /** @deprecated Use productDetail(slug) — legacy series/sku URLs redirect automatically */
  productDetailLegacy: (series: string, partNumber: string) =>
    `/product/${series}/${partNumber}`,
  cmsPage: (slug: string) => `/${slug}`,
} as const;

/** Guest-only pages — logged-in users are redirected away */
export const GUEST_ONLY_ROUTES = ["/login", "/register", "/forgot-password"] as const;

/** Protected pages — login required (enforced by src/proxy.ts). */
export const PROTECTED_ROUTES = ["/my-account"] as const;
// /cart is guest-accessible in WooCommerce (guests always see their cart).
// /checkout guest access is driven by WC "Allow customers to place orders
// without an account" setting — enforced in checkout/page.tsx, not here.

/**
 * App Router file mapping (Next.js best practice — single source of truth).
 *
 * /                          → (website)/page.tsx
 * /:slug                     → (website)/[slug]/page.tsx (CMS + shop alias)
 * /product                   → (website)/product/page.tsx
 * /product/:slug             → (website)/product/[...segments]/page.tsx
 * /product-category          → (website)/product-category/page.tsx (redirect)
 * /product-category/*        → (website)/product-category/[...slug]/page.tsx
 * /cart, /login, /register   → static auth/cart routes
 */
export const APP_ROUTE_SEGMENTS = {
  product: "product",
  productCategory: "product-category",
  cart: "cart",
  login: "login",
  register: "register",
  myAccount: "my-account",
} as const;

/** Next.js API proxy routes */
export const API_ROUTES = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    register: "/api/auth/register",
    me: "/api/auth/me",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
  },
  menu: "/api/menu",
  search: "/api/search",
  cart: "/api/cart",
  cartUpdate: "/api/cart/update",
  cartRemove: "/api/cart/remove",
  cartCustomer: "/api/cart/customer",
  cartSelectShipping: "/api/cart/select-shipping",
  cartCoupon: "/api/cart/coupon",
  cartCertOptIn: "/api/cart/cert-optin",
  checkout: "/api/checkout",
  checkoutLocations: "/api/checkout/locations",
  checkoutVerifyIntent: "/api/checkout/verify-intent",
  catalogProducts: "/api/catalog/products",
  catalogCategories: "/api/catalog/categories",
  account: {
    details: "/api/account/details",
    addresses: "/api/account/addresses",
    password: "/api/account/password",
    paymentMethods: "/api/account/payment-methods",
    paymentMethod: (pm_id: string) => `/api/account/payment-methods/${encodeURIComponent(pm_id)}`,
    paymentMethodDefault: (token_id: string) =>
      `/api/account/payment-methods/${encodeURIComponent(token_id)}/default`,
  },
  orders: "/api/orders",
  order: (id: number) => `/api/orders/${id}`,
  orderDocuments: "/api/orders/documents",
  taxExemption: "/api/tax-exemption",
  download: "/api/download",
  contact: "/api/contact",
} as const;

/** WordPress custom REST endpoints */
export const WP_ROUTES = {
  login: "/wp-json/custom/v1/auth/login",
  logout: "/wp-json/custom/v1/auth/logout",
  register: "/wp-json/custom/v1/auth/register",
  me: "/wp-json/custom/v1/auth/me",
  forgotPassword: "/wp-json/custom/v1/auth/forgot-password",
  resetPassword: "/wp-json/custom/v1/auth/reset-password",
  cart: "/wp-json/custom/v1/cart",
  cartRemove: "/wp-json/custom/v1/cart/remove",
  homePage: "/wp-json/custom/v1/home-page",
  aboutPage: "/wp-json/custom/v1/about-page",
  qualityPage: "/wp-json/custom/v1/quality-page",
  contactPage: "/wp-json/custom/v1/contact-page",
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
