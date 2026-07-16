/**
 * File Name: order-documents.client.ts
 * Description: Client API for post-purchase product documents.
 * Developer: KP-184
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-15
 */

import { apiGet } from "@/utils/api-client";
import { API_ROUTES } from "@/config/routes";
import type { OrderDocumentsResponse } from "@/types/order-documents.types";

export async function fetch_order_documents(): Promise<OrderDocumentsResponse> {
  const { ok, data } = await apiGet<OrderDocumentsResponse>(
    API_ROUTES.orderDocuments,
    // timeout > the proxy's 30s WP window — the documents endpoint walks all
    // customer orders in WP and legitimately takes longer than the 12s default.
    { retries: 2, timeout: 35_000 }
  );
  if (!ok) throw new Error("Unable to load order documents.");
  return data;
}
