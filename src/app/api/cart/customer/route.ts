/**
 * File Name: route.ts
 * Description: Proxy cart customer/address update to WooCommerce Store API.
 *              Updating the address makes WooCommerce recalculate shipping
 *              rates (Shippo) and tax — response includes fresh checkout state.
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import { NextRequest } from "next/server";

import { ENV } from "@/config/env";
import {
  buildCheckoutCartStateResponse,
  buildWcStoreHeaders,
  fetchStoreCart,
} from "@/utils/wc-cart-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const WC_BILLING_KEYS = ["first_name","last_name","company","address_1","address_2","city","state","postcode","country","phone","email"] as const;
const WC_SHIPPING_KEYS = ["first_name","last_name","company","address_1","address_2","city","state","postcode","country","phone"] as const;

function pickWcAddress(
  addr: Record<string, string>,
  isBilling: boolean
): Record<string, string> {
  const keys = isBilling ? WC_BILLING_KEYS : WC_SHIPPING_KEYS;
  const out: Record<string, string> = {};
  for (const k of keys) if (k in addr) out[k] = addr[k] ?? "";
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      shipping_address?: Record<string, string>;
      billing_address?: Record<string, string>;
    };

    if (!body.shipping_address && !body.billing_address) {
      return Response.json(
        { message: "An address is required." },
        { status: 400 }
      );
    }

    const bootstrapResponse = await fetchStoreCart(request);

    const wpResponse = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/wc/store/v1/cart/update-customer`,
      {
        method: "POST",
        headers: buildWcStoreHeaders(request, true, bootstrapResponse),
        body: JSON.stringify({
          billing_address: pickWcAddress(
            (body.billing_address ?? body.shipping_address) as Record<string, string>,
            true
          ),
          shipping_address: pickWcAddress(
            (body.shipping_address ?? body.billing_address) as Record<string, string>,
            false
          ),
        }),
        cache: "no-store",
      }
    );

    return buildCheckoutCartStateResponse(wpResponse);
  } catch (error) {
    console.error("Cart customer proxy error:", error);
    return Response.json({ message: "Address update failed." }, { status: 500 });
  }
}
