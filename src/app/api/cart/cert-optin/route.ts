/**
 * File Name: route.ts
 * Description: Sync certificate opt-in selections to the WC session.
 *   POST → wc/store/v1/cart/extensions (mmf_cert namespace). WC recalculates
 *   totals (certificate fees apply when paid certificates are enabled) and
 *   the updated cart + checkout state comes back in one round trip.
 *   Free mode never calls this route — the checkbox is pure UI state there.
 * Developer: KP-184
 * Created Date: 2026-07-17
 */

import { NextRequest } from "next/server";

import {
  buildCheckoutCartStateResponse,
  sanitizeCertOptInMap,
  wcStoreMutation,
} from "@/utils/wc-cart-proxy.utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      cert_opted_in?: Record<string, boolean>;
    };

    const wpResponse = await wcStoreMutation(request, "cart/extensions", {
      namespace: "mmf_cert",
      // Sanitized: only true values with WC cart-key-shaped keys, capped —
      // an empty map is still valid (it clears every opt-in server-side).
      data: { cert_opted_in: sanitizeCertOptInMap(body.cert_opted_in) ?? {} },
    });

    return buildCheckoutCartStateResponse(wpResponse);
  } catch (error) {
    console.error("Cert opt-in sync proxy error:", error);
    return Response.json(
      { message: "Could not update certification selection." },
      { status: 500 }
    );
  }
}
