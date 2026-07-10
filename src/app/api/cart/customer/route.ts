/**
 * File Name: route.ts
 * Description: Proxy cart customer/address update to WooCommerce Store API.
 *              Updating the address makes WooCommerce recalculate shipping
 *              rates (Shippo) and tax — response includes fresh checkout state.
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import { NextRequest } from "next/server";

import {
  buildCheckoutCartStateResponse,
  wcStoreMutation,
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
  for (const k of keys) {
    // cart/update-customer is a partial merge — only send fields the user has
    // actually filled in. WC validates every field that IS sent (phone format,
    // postcode format, email format, etc.), so skipping empty strings prevents
    // spurious 400s when location-only recalculation fires before the full
    // address is typed. WC preserves any previously-saved values for omitted
    // fields, so nothing is lost.
    if (addr[k]) out[k] = addr[k];
  }
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

    const wpResponse = await wcStoreMutation(request, "cart/update-customer", {
      billing_address: pickWcAddress(
        (body.billing_address ?? body.shipping_address) as Record<string, string>,
        true
      ),
      shipping_address: pickWcAddress(
        (body.shipping_address ?? body.billing_address) as Record<string, string>,
        false
      ),
    });

    return buildCheckoutCartStateResponse(wpResponse);
  } catch (error) {
    console.error("Cart customer proxy error:", error);
    return Response.json({ message: "Address update failed." }, { status: 500 });
  }
}
