/**
 * File Name: route.ts
 * Description: Proxy shipping-rate selection to WooCommerce Store API.
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      package_id?: number | string;
      rate_id?: string;
    };

    if (!body.rate_id) {
      return Response.json(
        { message: "A shipping rate is required." },
        { status: 400 }
      );
    }

    const wpResponse = await wcStoreMutation(request, "cart/select-shipping-rate", {
      package_id: body.package_id ?? 0,
      rate_id: body.rate_id,
    });

    return buildCheckoutCartStateResponse(wpResponse);
  } catch (error) {
    console.error("Select shipping proxy error:", error);
    return Response.json(
      { message: "Shipping selection failed." },
      { status: 500 }
    );
  }
}
