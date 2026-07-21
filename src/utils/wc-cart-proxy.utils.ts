/**
 * File Name: wc-cart-proxy.utils.ts
 * Description: WooCommerce Store API proxy helpers and cart mapping.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { CartData, CartCoupon, CartItem, CartItemQuantityLimits } from "@/types/cart.types";
import type {
  CheckoutAddress,
  CheckoutCartState,
  ShippingPackage,
} from "@/types/checkout.types";
import {
  appendSetCookie,
  buildProxiedResponse,
  buildWpCookieHeader,
  WC_CART_TOKEN_COOKIE,
  WC_STORE_NONCE_COOKIE,
} from "@/utils/auth-proxy.utils";

export { WC_CART_TOKEN_COOKIE, WC_STORE_NONCE_COOKIE };
import {
  mapStoreQuantityLimits,
  normalizeWcMaxQuantity,
} from "@/utils/cart-stock.utils";
import { decodeHtmlEntities, formatNoticeMessage } from "@/utils/text.utils";

// Headers.forEach combines multiple Set-Cookie values into one comma-joined
// string, which breaks cookie values that contain commas. getSetCookie()
// (WHATWG Fetch / Node.js 18.14+) returns each header separately.
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

interface StoreCartPrice {
  price: string;
  currency_minor_unit?: number;
}

interface StoreCartItemTotals {
  line_total: string;
}

interface StoreCartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  sku: string;
  permalink: string;
  prices: StoreCartPrice;
  totals: StoreCartItemTotals;
  quantity_limits?: Partial<CartItemQuantityLimits>;
  stock_availability?: {
    text?: string;
    class?: string;
  };
  extensions?: {
    mmf_cert?: {
      has_certificate?: boolean;
      certificate_price?: number;
    };
  };
  low_stock_remaining?: number | null;
  backorders_allowed?: boolean;
  sold_individually?: boolean;
}

interface StoreCartTotals {
  total_items: string;
  total_price: string;
  total_shipping?: string;
  total_tax?: string;
  total_discount?: string;
  currency_code?: string;
  currency_minor_unit?: number;
}

interface StoreCartCoupon {
  code: string;
  totals?: {
    total_discount?: string;
    currency_minor_unit?: number;
  };
}

interface StoreShippingRate {
  rate_id: string;
  name: string;
  description?: string;
  price: string;
  currency_minor_unit?: number;
  method_id: string;
  selected: boolean;
}

interface StoreShippingPackage {
  package_id: number | string;
  name: string;
  shipping_rates: StoreShippingRate[];
}

export interface StoreCartResponse {
  items: StoreCartItem[];
  items_count: number;
  totals: StoreCartTotals;
  needs_shipping?: boolean;
  shipping_rates?: StoreShippingPackage[];
  shipping_address?: Partial<CheckoutAddress>;
  billing_address?: Partial<CheckoutAddress>;
  payment_methods?: string[];
  coupons?: StoreCartCoupon[];
}

function getHeaderValue(response: Response, name: string): string | null {
  return response.headers.get(name) ?? response.headers.get(name.toLowerCase());
}

function formatMinorUnits(
  amount: string,
  minorUnit = 2,
  currencyCode = "USD"
): string {
  const value = Number(amount) / 10 ** minorUnit;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(Number.isFinite(value) ? value : 0);
}


function mapQuantityLimits(
  limits?: Partial<CartItemQuantityLimits>
): CartItemQuantityLimits | undefined {
  return mapStoreQuantityLimits(limits);
}

function mapStockAvailability(item: StoreCartItem) {
  if (!item.stock_availability?.text && !item.stock_availability?.class) {
    return undefined;
  }

  return {
    text: decodeHtmlEntities(item.stock_availability.text || ""),
    class: item.stock_availability.class || "",
  };
}

function mapIsInStock(item: StoreCartItem): boolean {
  if (item.stock_availability?.class?.includes("out-of-stock")) {
    return false;
  }

  const maxQuantity = normalizeWcMaxQuantity(item.quantity_limits?.maximum);

  if (
    item.quantity_limits?.maximum === 0 &&
    maxQuantity === undefined &&
    !item.backorders_allowed
  ) {
    return false;
  }

  return true;
}

export function mapStoreCartToCartData(storeCart: StoreCartResponse): CartData {
  const minorUnit = storeCart.totals.currency_minor_unit ?? 2;
  // Currency comes from WooCommerce settings via the Store API — never assume USD.
  const currency = storeCart.totals.currency_code || "USD";

  const items: CartItem[] = storeCart.items.map((item) => {
    const lineTotal = formatMinorUnits(
      item.totals.line_total,
      item.prices.currency_minor_unit ?? minorUnit,
      currency
    );
    const sku = decodeHtmlEntities(item.sku || "");
    const name = decodeHtmlEntities(item.name);

    return {
      key: item.key,
      product_id: item.id,
      quantity: item.quantity,
      sku,
      name,
      price: Number(item.prices.price) / 10 ** (item.prices.currency_minor_unit ?? minorUnit),
      line_total:
        Number(item.totals.line_total) /
        10 ** (item.prices.currency_minor_unit ?? minorUnit),
      price_html: lineTotal,
      url: item.permalink,
      quantity_limits: mapQuantityLimits(item.quantity_limits),
      stock_availability: mapStockAvailability(item),
      low_stock_remaining: item.low_stock_remaining ?? null,
      backorders_allowed: Boolean(item.backorders_allowed),
      sold_individually: Boolean(item.sold_individually),
      is_in_stock: mapIsInStock(item),
      has_certificate: Boolean(item.extensions?.mmf_cert?.has_certificate),
      certificate_price: Number(item.extensions?.mmf_cert?.certificate_price ?? 0),
    };
  });

  const discountRaw = Number(storeCart.totals.total_discount ?? "0");
  const coupons: CartCoupon[] = (storeCart.coupons ?? []).map((coupon) => ({
    code: coupon.code,
    discount: formatMinorUnits(
      coupon.totals?.total_discount ?? "0",
      coupon.totals?.currency_minor_unit ?? minorUnit,
      currency
    ),
  }));

  return {
    items,
    item_count: storeCart.items_count,
    subtotal: formatMinorUnits(storeCart.totals.total_items, minorUnit, currency),
    shipping_total: formatMinorUnits(storeCart.totals.total_shipping ?? "0", minorUnit, currency),
    tax_total: formatMinorUnits(storeCart.totals.total_tax ?? "0", minorUnit, currency),
    discount_total:
      discountRaw > 0
        ? formatMinorUnits(storeCart.totals.total_discount ?? "0", minorUnit, currency)
        : "",
    total: formatMinorUnits(storeCart.totals.total_price, minorUnit, currency),
    checkout_url: `${ENV.WP_SITE_URL}/checkout`,
    cart_url: `${ENV.WP_SITE_URL}/cart`,
    coupons,
  };
}

/**
 * Map the raw Store API cart to the checkout-page state shape
 * (totals summary, shipping packages/rates, saved addresses).
 */
export function mapStoreCartToCheckoutState(
  storeCart: StoreCartResponse
): CheckoutCartState {
  const minorUnit = storeCart.totals.currency_minor_unit ?? 2;
  const currency = storeCart.totals.currency_code || "USD";

  const shipping_packages: ShippingPackage[] = (storeCart.shipping_rates ?? []).map(
    (pkg) => ({
      package_id: pkg.package_id,
      name: pkg.name,
      shipping_rates: pkg.shipping_rates.map((rate) => ({
        rate_id: rate.rate_id,
        name: decodeHtmlEntities(rate.name),
        description: decodeHtmlEntities(rate.description || ""),
        price: formatMinorUnits(rate.price, rate.currency_minor_unit ?? minorUnit, currency),
        currency_minor_unit: rate.currency_minor_unit ?? minorUnit,
        method_id: rate.method_id,
        selected: Boolean(rate.selected),
      })),
    })
  );

  const discountRaw = Number(storeCart.totals.total_discount ?? "0");

  return {
    totals: {
      subtotal: formatMinorUnits(storeCart.totals.total_items, minorUnit, currency),
      shipping_total: formatMinorUnits(storeCart.totals.total_shipping ?? "0", minorUnit, currency),
      tax_total: formatMinorUnits(storeCart.totals.total_tax ?? "0", minorUnit, currency),
      discount_total:
        discountRaw > 0
          ? formatMinorUnits(storeCart.totals.total_discount ?? "0", minorUnit, currency)
          : "",
      total: formatMinorUnits(storeCart.totals.total_price, minorUnit, currency),
    },
    shipping_packages,
    needs_shipping: storeCart.needs_shipping !== undefined
      ? Boolean(storeCart.needs_shipping)
      : shipping_packages.length > 0,
    shipping_address: storeCart.shipping_address ?? {},
    billing_address: storeCart.billing_address ?? {},
    // WooCommerce decides per customer (e.g. Net 30/cod only for flagged accounts).
    payment_methods: storeCart.payment_methods ?? [],
    coupons: (storeCart.coupons ?? []).map((coupon) => ({
      code: coupon.code,
      discount: formatMinorUnits(
        coupon.totals?.total_discount ?? "0",
        coupon.totals?.currency_minor_unit ?? minorUnit,
        currency
      ),
    })),
  };
}

/**
 * Sanitize a client-supplied cert opt-in map before forwarding to WC.
 *
 * Keeps only entries with a plausible cart-item-key shape (WC uses 32-char
 * md5 hashes) whose value is exactly true, capped at 100 items — a cart
 * can never legitimately exceed that. Returns undefined when nothing valid
 * remains so callers can skip the extensions payload entirely.
 */
export function sanitizeCertOptInMap(
  raw: unknown
): Record<string, boolean> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const out: Record<string, boolean> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value !== true) continue;
    if (!/^[a-f0-9]{6,64}$/i.test(key)) continue;
    out[key] = true;
    if (++count >= 100) break;
  }

  return count > 0 ? out : undefined;
}

// Cert-availability lookups hit WP once per SKU, then serve from this
// process-local TTL cache — checkout address/shipping/coupon refreshes reuse
// it instead of re-querying WP on every totals recalculation. Bounded so a
// catalog crawl can't grow it unbounded.
const CERT_LOOKUP_TTL_MS = 5 * 60_000;
const CERT_LOOKUP_MAX_ENTRIES = 500;
const certLookupCache = new Map<string, { value: boolean; expiresAt: number }>();

async function lookupCertAvailability(sku: string): Promise<boolean> {
  const cached = certLookupCache.get(sku);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let value = false;
  try {
    const response = await fetch(
      // ?_nc busts Pantheon's Varnish cache (same reason as fetchStoreCart).
      `${ENV.WP_SITE_URL}/wp-json/spec-parts/v1/products/sku/${encodeURIComponent(sku)}?_nc=${Date.now()}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (response.ok) {
      const data = (await response.json()) as { certificate_file_url?: string };
      value = Boolean(data.certificate_file_url);
    } else {
      // Lookup failed — don't cache, so the next request retries.
      return false;
    }
  } catch {
    return false;
  }

  if (certLookupCache.size >= CERT_LOOKUP_MAX_ENTRIES) {
    // Simple bound: drop the oldest entry (Map preserves insertion order).
    const oldest = certLookupCache.keys().next().value;
    if (oldest !== undefined) {
      certLookupCache.delete(oldest);
    }
  }
  certLookupCache.set(sku, { value, expiresAt: Date.now() + CERT_LOOKUP_TTL_MS });

  return value;
}

/**
 * Fill has_certificate for cart items the Store API extension didn't cover.
 *
 * Primary source is the mmf_cert Store API extension (wordpress/inc/cart.php).
 * The spec-parts catalog endpoint exposes certificate_file_url per product,
 * so it answers the same question when the extension data is absent — the
 * checkout opt-in checkbox renders either way. Fail-open: lookup errors just
 * leave has_certificate false for that item.
 */
async function enrichCartCertAvailability(cart: CartData): Promise<CartData> {
  const pending = cart.items.filter((item) => !item.has_certificate && item.sku);
  if (pending.length === 0) {
    return cart;
  }

  const results = await Promise.all(
    pending.map(async (item) => [item.key, await lookupCertAvailability(item.sku)] as const)
  );

  const certByKey = new Map<string, boolean>(results);

  return {
    ...cart,
    items: cart.items.map((item) =>
      certByKey.get(item.key) ? { ...item, has_certificate: true } : item
    ),
  };
}

/**
 * Build a proxy response carrying both the mapped cart and checkout state,
 * persisting the Store API session cookies (nonce + cart token).
 */
export async function buildCheckoutCartStateResponse(
  wpResponse: Response
): Promise<NextResponse> {
  const raw = (await wpResponse.json().catch(() => null)) as
    | StoreCartResponse
    | { code?: string; message?: string }
    | null;

  if ( ! wpResponse.ok || ! raw || ! ( "items" in raw ) ) {
    const message = formatNoticeMessage(
      raw && "message" in raw && raw.message ? raw.message : "Cart request failed."
    );
    // When WP returns a PHP fatal (HTML body, status 200), raw is null.
    // Force a 503 so response.ok is false on the client — avoids silent failures.
    const status = !raw ? 503 : wpResponse.status || 500;

    // Diagnostic trail for "Checkout unavailable" reports — shows the real
    // upstream status/code in the server terminal (never sent to the shopper).
    console.error(
      `[checkout-state] WP cart fetch failed: status=${wpResponse.status}`,
      raw && "code" in raw ? `code=${raw.code}` : "(unparseable body)",
      message
    );

    return NextResponse.json(
      { message, code: raw && "code" in raw ? raw.code : undefined },
      { status }
    );
  }

  const response = NextResponse.json(
    {
      cart: await enrichCartCertAvailability(mapStoreCartToCartData(raw)),
      checkout: mapStoreCartToCheckoutState(raw),
    },
    { status: wpResponse.status }
  );
  response.headers.set("Cache-Control", "no-store, private");

  forwardSetCookieHeaders(wpResponse, response);
  persistStoreSessionCookies(wpResponse, response);

  return response;
}

export function persistStoreSessionCookies(
  wpResponse: Response,
  response: NextResponse
): void {
  const nonce = getHeaderValue(wpResponse, "nonce");
  const cartToken = getHeaderValue(wpResponse, "cart-token");

  // Raw appends — response.cookies.set would clobber forwarded WP cookies.
  if (nonce) {
    appendSetCookie(response, WC_STORE_NONCE_COOKIE, nonce);
  }

  if (cartToken) {
    appendSetCookie(response, WC_CART_TOKEN_COOKIE, cartToken);
  }
}

export function buildWcStoreHeaders(
  request: NextRequest,
  includeJson = false,
  bootstrapResponse?: Response,
  options: { skipSessionCookies?: boolean; preferBootstrap?: boolean; skipWpCookie?: boolean } = {}
): HeadersInit {
  const headers: Record<string, string> = options.skipWpCookie
    ? { Accept: "application/json" }
    : {
        Accept: "application/json",
        ...(buildWpCookieHeader(request.headers.get("cookie")) as Record<string, string>),
      };

  if (!options.skipSessionCookies) {
    const cookieNonce = request.cookies.get(WC_STORE_NONCE_COOKIE)?.value || null;
    const cookieToken = request.cookies.get(WC_CART_TOKEN_COOKIE)?.value || null;
    const bootNonce = bootstrapResponse ? getHeaderValue(bootstrapResponse, "nonce") : null;
    const bootToken = bootstrapResponse ? getHeaderValue(bootstrapResponse, "cart-token") : null;

    // preferBootstrap: retry path after a 401/403 — the request cookie is the
    // stale value that just failed, so the fresh bootstrap session must win.
    const nonce = options.preferBootstrap ? bootNonce || cookieNonce : cookieNonce || bootNonce;
    const cartToken = options.preferBootstrap ? bootToken || cookieToken : cookieToken || bootToken;

    if (nonce) {
      headers.Nonce = nonce;
    }

    if (cartToken) {
      headers["Cart-Token"] = cartToken;
    }
  }

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

/**
 * POST to a WC Store API endpoint with the fewest possible WP round trips.
 *
 * Fast path (the common case): the browser already carries the Store API
 * session cookies (nonce + cart token) from a previous cart response — call
 * the endpoint directly, ONE round trip.
 *
 * Slow path (first request of a session, or an expired nonce → 401/403):
 * bootstrap a fresh session via GET /cart, then retry once with the fresh
 * nonce/cart-token taking precedence over the stale request cookies.
 */
// Mutations (checkout POST, address update) can also sit behind live shipping
// or payment-gateway calls — bounded so a stuck upstream fails visibly instead
// of hanging the route until the platform kills it.
const WC_MUTATION_TIMEOUT_MS = 60_000;

export async function wcStoreMutation(
  request: NextRequest,
  path: string,
  payload: unknown,
  method = "POST"
): Promise<Response> {
  const url = `${ENV.WP_SITE_URL}/wp-json/wc/store/v1/${path}`;
  const body = JSON.stringify(payload);

  if (request.cookies.get(WC_STORE_NONCE_COOKIE)?.value) {
    const direct = await fetch(url, {
      method,
      headers: buildWcStoreHeaders(request, true),
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(WC_MUTATION_TIMEOUT_MS),
    });

    if (direct.status !== 401 && direct.status !== 403) {
      return direct;
    }
  }

  const bootstrapResponse = await fetchStoreCart(request);

  return fetch(url, {
    method,
    headers: buildWcStoreHeaders(request, true, bootstrapResponse, { preferBootstrap: true }),
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(WC_MUTATION_TIMEOUT_MS),
  });
}

export async function buildStoreCartResponse(
  wpResponse: Response,
  options: { allowEmptyOnFailure?: boolean } = {}
): Promise<NextResponse> {
  const raw = (await wpResponse.json().catch(() => null)) as
    | StoreCartResponse
    | { code?: string; message?: string }
    | null;

  if (!wpResponse.ok || !raw || !("items" in raw)) {
    if (options.allowEmptyOnFailure) {
      return buildEmptyCartResponse();
    }

    const message = formatNoticeMessage(
      raw && "message" in raw && raw.message
        ? raw.message
        : "Cart request failed."
    );
    const status = !raw ? 503 : wpResponse.status || 500;

    return NextResponse.json(
      {
        message,
        code: raw && "code" in raw ? raw.code : undefined,
      },
      { status }
    );
  }

  const cart = mapStoreCartToCartData(raw);
  const response = NextResponse.json(cart, { status: wpResponse.status });
  response.headers.set("Cache-Control", "no-store, private");

  forwardSetCookieHeaders(wpResponse, response);
  persistStoreSessionCookies(wpResponse, response);

  return response;
}

export async function buildStoreCartMutationResponse(
  wpResponse: Response,
  successMessage = "Cart updated."
): Promise<NextResponse> {
  const raw = (await wpResponse.json().catch(() => null)) as
    | StoreCartResponse
    | { code?: string; message?: string }
    | null;

  if (!wpResponse.ok || !raw || !("items" in raw)) {
    const message = formatNoticeMessage(
      raw && "message" in raw && raw.message
        ? raw.message
        : "Cart request failed."
    );
    const status = !raw ? 503 : wpResponse.status || 500;

    return NextResponse.json(
      {
        message,
        code: raw && "code" in raw ? raw.code : undefined,
      },
      { status }
    );
  }

  const cart = mapStoreCartToCartData(raw);
  const response = NextResponse.json(
    {
      message: formatNoticeMessage(successMessage),
      cart,
    },
    { status: wpResponse.status }
  );
  response.headers.set("Cache-Control", "no-store, private");

  forwardSetCookieHeaders(wpResponse, response);
  persistStoreSessionCookies(wpResponse, response);

  return response;
}

export async function resolveProductIdBySku(sku: string): Promise<number | null> {
  const encodedSku = encodeURIComponent(sku.trim());

  try {
    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/spec-parts/v1/products/sku/${encodedSku}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { id?: number };
    return data.id ?? null;
  } catch {
    return null;
  }
}

// Cart GET can trigger a full shipping recalculation in WC (Shippo live-rate
// API calls for carts with items + a saved address) — allow a generous window,
// but never hang the proxy indefinitely on a stuck carrier API.
const WC_CART_FETCH_TIMEOUT_MS = 30_000;

export async function fetchStoreCart(
  request: NextRequest,
  options: { skipSessionCookies?: boolean; skipWpCookie?: boolean } = {}
): Promise<Response> {
  // ?_nc busts Pantheon's Varnish cache: the cart endpoint is served with
  // Cache-Control: public, max-age=604800 and Vary doesn't include Cart-Token,
  // so Varnish returns a stale empty cart for every guest. A unique query param
  // forces a cache MISS on every request. The functions.php rest_post_dispatch
  // filter adds Cache-Control: no-store server-side once deployed; this is the
  // client-side safety net.
  const url = `${ENV.WP_SITE_URL}/wp-json/wc/store/v1/cart?_nc=${Date.now()}`;
  return fetch(url, {
    method: "GET",
    headers: buildWcStoreHeaders(request, false, undefined, options),
    cache: "no-store",
    signal: AbortSignal.timeout(WC_CART_FETCH_TIMEOUT_MS),
  });
}

/**
 * Fetch cart and recover from stale WooCommerce session cookies.
 *
 * Two-stage recovery for logged-in users with an expired WC Store API nonce:
 *
 *   Stage 1 — drop stale Nonce + Cart-Token, keep WP login cookie.
 *   The WP auth filter (mmf_headless_cookie_auth) restores the user from the
 *   cookie without requiring X-WP-Nonce, so WC loads the logged-in user's cart
 *   and issues a fresh nonce + cart-token in the response headers.
 *
 *   Stage 2 — if Stage 1 still 401s (e.g. the PHP fix isn't deployed yet or the
 *   WP session itself is also expired), drop ALL cookies for a completely fresh
 *   guest request. WC returns a 200 with a new nonce — the checkout page can at
 *   least render (showing an empty cart) instead of "Checkout unavailable".
 */
export async function fetchStoreCartWithRecovery(
  request: NextRequest
): Promise<Response> {
  const response = await fetchStoreCart(request);

  if (response.ok) {
    return response;
  }

  const hadSessionCookie = Boolean(
    request.cookies.get(WC_CART_TOKEN_COOKIE)?.value ||
      request.cookies.get(WC_STORE_NONCE_COOKIE)?.value
  );

  if (
    hadSessionCookie &&
    (response.status === 400 ||
      response.status === 401 ||
      response.status === 403)
  ) {
    // Stage 1: drop WC session tokens, keep WP login cookie.
    const stage1 = await fetchStoreCart(request, { skipSessionCookies: true });
    if (stage1.ok) return stage1;

    // Stage 2: drop everything — at minimum a guest cart loads the page.
    if (stage1.status === 401 || stage1.status === 403) {
      return fetchStoreCart(request, { skipSessionCookies: true, skipWpCookie: true });
    }

    return stage1;
  }

  return response;
}

function buildEmptyCartResponse(): NextResponse {
  const emptyCart: CartData = {
    items: [],
    item_count: 0,
    subtotal: "",
    shipping_total: "",
    tax_total: "",
    discount_total: "",
    total: "",
    checkout_url: `${ENV.WP_SITE_URL}/checkout`,
    cart_url: `${ENV.WP_SITE_URL}/cart`,
    coupons: [],
  };

  const response = NextResponse.json(emptyCart, { status: 200 });
  response.headers.set("Cache-Control", "no-store, private");

  appendSetCookie(response, WC_CART_TOKEN_COOKIE, "", { expire: true });
  appendSetCookie(response, WC_STORE_NONCE_COOKIE, "", { expire: true });

  return response;
}

export { buildProxiedResponse };
