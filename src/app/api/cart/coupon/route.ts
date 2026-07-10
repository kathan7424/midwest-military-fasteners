/**
 * File Name: route.ts
 * Description: Proxy coupon apply/remove to the WooCommerce Store API.
 *   POST   { code } → /wc/store/v1/cart/apply-coupon
 *   DELETE { code } → /wc/store/v1/cart/remove-coupon
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { NextRequest } from "next/server";

import {
  buildCheckoutCartStateResponse,
  wcStoreMutation,
} from "@/utils/wc-cart-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function proxyCouponAction(request: NextRequest, endpoint: string) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim();

  if (!code) {
    return Response.json({ message: "A coupon code is required." }, { status: 400 });
  }

  if (code.length > 64) {
    return Response.json({ message: "Coupon code is too long." }, { status: 400 });
  }

  const wpResponse = await wcStoreMutation(request, `cart/${endpoint}`, { code });

  return buildCheckoutCartStateResponse(wpResponse);
}

export async function POST(request: NextRequest) {
  try {
    return await proxyCouponAction(request, "apply-coupon");
  } catch (error) {
    console.error("Apply coupon proxy error:", error);
    return Response.json({ message: "Coupon could not be applied." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxyCouponAction(request, "remove-coupon");
  } catch (error) {
    console.error("Remove coupon proxy error:", error);
    return Response.json({ message: "Coupon could not be removed." }, { status: 500 });
  }
}
