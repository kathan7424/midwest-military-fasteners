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
import { buildProxiedResponse, buildWpCookieHeader } from "@/utils/auth-proxy.utils";
import {
  mapStoreQuantityLimits,
  normalizeWcMaxQuantity,
} from "@/utils/cart-stock.utils";
import { decodeHtmlEntities, formatNoticeMessage } from "@/utils/text.utils";

export const WC_STORE_NONCE_COOKIE = "wc_store_nonce";
export const WC_CART_TOKEN_COOKIE = "wc_cart_token";

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
  currency_minor_unit?: number;
}

export interface StoreCartResponse {
  items: StoreCartItem[];
  items_count: number;
  totals: StoreCartTotals;
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

  const items: CartItem[] = storeCart.items.map((item) => {
    const lineTotal = formatMinorUnits(
      item.totals.line_total,
      item.prices.currency_minor_unit ?? minorUnit
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
    subtotal: formatMinorUnits(storeCart.totals.total_items, minorUnit),
    total: formatMinorUnits(storeCart.totals.total_price, minorUnit),
    checkout_url: `${ENV.WP_SITE_URL}/checkout`,
    cart_url: `${ENV.WP_SITE_URL}/cart`,
  };
}

export function buildWcStoreHeaders(
  request: NextRequest,
  includeJson = false,
  bootstrapResponse?: Response
): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(buildWpCookieHeader(request.headers.get("cookie")) as Record<string, string>),
  };

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

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

export async function buildStoreCartResponse(
  wpResponse: Response
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
  const response = NextResponse.json(cart, { status: wpResponse.status });

  wpResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("set-cookie", value);
    }
  });

  const nonce = getHeaderValue(wpResponse, "nonce");
  const cartToken = getHeaderValue(wpResponse, "cart-token");

  if (nonce) {
    response.cookies.set(WC_STORE_NONCE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  if (cartToken) {
    response.cookies.set(WC_CART_TOKEN_COOKIE, cartToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

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

  const nonce = getHeaderValue(wpResponse, "nonce");
  const cartToken = getHeaderValue(wpResponse, "cart-token");

  if (nonce) {
    response.cookies.set(WC_STORE_NONCE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  if (cartToken) {
    response.cookies.set(WC_CART_TOKEN_COOKIE, cartToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

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

export async function fetchStoreCart(request: NextRequest): Promise<Response> {
  return fetch(`${ENV.WP_SITE_URL}/wp-json/wc/store/v1/cart`, {
    method: "GET",
    headers: buildWcStoreHeaders(request),
    cache: "no-store",
  });
}

export { buildProxiedResponse };
