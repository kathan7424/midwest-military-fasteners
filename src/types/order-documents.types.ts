/**
 * File Name: order-documents.types.ts
 * Description: Post-purchase product spec sheet + certificate downloads.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

export interface OrderDocumentLineItem {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
  spec_file_url: string;
  certificate_file_url: string;
}

export interface OrderDocumentsGroup {
  order_id: number;
  order_number: string;
  order_date: string;
  items: OrderDocumentLineItem[];
}

export interface OrderDocumentsResponse {
  orders: OrderDocumentsGroup[];
}
