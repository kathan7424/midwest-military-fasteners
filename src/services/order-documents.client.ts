/**
 * File Name: order-documents.client.ts
 * Description: Client API for post-purchase product documents.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { OrderDocumentsResponse } from "@/types/order-documents.types";

export async function fetch_order_documents(): Promise<OrderDocumentsResponse> {
  const response = await fetch("/api/orders/documents", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load order documents.");
  }

  return (await response.json()) as OrderDocumentsResponse;
}
