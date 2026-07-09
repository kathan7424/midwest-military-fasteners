/**
 * File Name: wc-cart-proxy.utils.ts
 * Description: WooCommerce Store API proxy helpers and cart mapping.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { CartData, CartItem, CartItemQuantityLimits } from "@/types/cart.types";
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
  low_stock_remaining?: number | null;
  backorders_allowed?: boolean;
  sold_individually?: boolean;
}

interface StoreCartTotals {
  total_items: string;
  total_price: string;
  total_shipping?: string;
  total_tax?: string;
  currency_code?: string;
  currency_minor_unit?: number;
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
    const sku = decodeHtmlEntities(item.sku || item.name);
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
    };
  });

  return {
    items,
    item_count: storeCart.items_count,
    subtotal: formatMinorUnits(storeCart.totals.total_items, minorUnit, currency),
    shipping_total: formatMinorUnits(storeCart.totals.total_shipping ?? "0", minorUnit, currency),
    tax_total: formatMinorUnits(storeCart.totals.total_tax ?? "0", minorUnit, currency),
    total: formatMinorUnits(storeCart.totals.total_price, minorUnit, currency),
    checkout_url: `${ENV.WP_SITE_URL}/checkout`,
    cart_url: `${ENV.WP_SITE_URL}/cart`,
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

  return {
    totals: {
      subtotal: formatMinorUnits(storeCart.totals.total_items, minorUnit, currency),
      shipping_total: formatMinorUnits(storeCart.totals.total_shipping ?? "0", minorUnit, currency),
      tax_total: formatMinorUnits(storeCart.totals.total_tax ?? "0", minorUnit, currency),
      total: formatMinorUnits(storeCart.totals.total_price, minorUnit, currency),
    },
    shipping_packages,
    needs_shipping: Boolean(storeCart.needs_shipping ?? shipping_packages.length > 0),
    shipping_address: storeCart.shipping_address ?? {},
    billing_address: storeCart.billing_address ?? {},
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

    return NextResponse.json(
      { message, code: raw && "code" in raw ? raw.code : undefined },
      { status: wpResponse.status || 500 }
    );
  }

  const response = NextResponse.json(
    {
      cart: mapStoreCartToCartData(raw),
      checkout: mapStoreCartToCheckoutState(raw),
    },
    { status: wpResponse.status }
  );
  response.headers.set("Cache-Control", "no-store, private");
  persistStoreSessionCookies(wpResponse, response);

  return response;
}

function persistStoreSessionCookies(
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
  options: { skipSessionCookies?: boolean } = {}
): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(buildWpCookieHeader(request.headers.get("cookie")) as Record<string, string>),
  };

  if (!options.skipSessionCookies) {
    const nonce =
      request.cookies.get(WC_STORE_NONCE_COOKIE)?.value ||
      (bootstrapResponse ? getHeaderValue(bootstrapResponse, "nonce") : null);
    const cartToken =
      request.cookies.get(WC_CART_TOKEN_COOKIE)?.value ||
      (bootstrapResponse ? getHeaderValue(bootstrapResponse, "cart-token") : null);

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

    return NextResponse.json(
      {
        message,
        code: raw && "code" in raw ? raw.code : undefined,
      },
      { status: wpResponse.status || 500 }
    );
  }

  const cart = mapStoreCartToCartData(raw);
  const response = NextResponse.json(cart, { status: wpResponse.status });
  response.headers.set("Cache-Control", "no-store, private");

  wpResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("set-cookie", value);
    }
  });

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

    return NextResponse.json(
      {
        message,
        code: raw && "code" in raw ? raw.code : undefined,
      },
      { status: wpResponse.status || 500 }
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

export async function fetchStoreCart(
  request: NextRequest,
  options: { skipSessionCookies?: boolean } = {}
): Promise<Response> {
  return fetch(`${ENV.WP_SITE_URL}/wp-json/wc/store/v1/cart`, {
    method: "GET",
    headers: buildWcStoreHeaders(request, false, undefined, options),
    cache: "no-store",
  });
}

/**
 * Fetch cart and recover from stale WooCommerce session cookies.
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
    return fetchStoreCart(request, { skipSessionCookies: true });
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
    total: "",
    checkout_url: `${ENV.WP_SITE_URL}/checkout`,
    cart_url: `${ENV.WP_SITE_URL}/cart`,
  };

  const response = NextResponse.json(emptyCart, { status: 200 });
  response.headers.set("Cache-Control", "no-store, private");

  appendSetCookie(response, WC_CART_TOKEN_COOKIE, "", { expire: true });
  appendSetCookie(response, WC_STORE_NONCE_COOKIE, "", { expire: true });

  return response;
}

export { buildProxiedResponse };
