/**
 * File Name: account.client.ts
 * Description: Client-side My Account API wrappers.
 * Developer: KP-184
 * Created Date: 2026-07-09
 * Last Modified: 2026-07-15
 */

import { apiGet, apiPost } from "@/utils/api-client";
import type { ApiResult } from "@/utils/api-client";
import { API_ROUTES } from "@/config/routes";

interface AccountAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface AddressesResponse {
  billing: AccountAddress;
  shipping: AccountAddress;
}

interface AccountDetailsPayload {
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  company: string;
}

interface PasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface AddressUpdatePayload {
  type: "billing" | "shipping";
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

/** One shipment tracking entry (Shippo / Shipment Tracking plugins). */
export interface OrderTrackingEntry {
  tracking_number: string;
  carrier: string;
  url: string;
  date_shipped: string;
}

interface OrderDetail {
  order_id: number;
  order_number: string;
  date: string;
  status: string;
  status_label: string;
  subtotal: string;
  shipping_total: string;
  tax_total: string;
  discount_total: string;
  total: string;
  payment_method: string;
  payment_method_title: string;
  customer_note: string;
  tracking?: OrderTrackingEntry[];
  line_items: Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
    subtotal: string;
    total: string;
    spec_file_url: string;
    certificate_file_url: string;
  }>;
  billing_address: AccountAddress;
  shipping_address: AccountAddress;
}

export interface OrderSummaryItem {
  order_id: number;
  order_number: string;
  date: string;
  status_label: string;
  total: string;
  item_count: number;
}

export async function fetch_orders(limit?: number): Promise<OrderSummaryItem[]> {
  const { ok, data } = await apiGet<{ orders: OrderSummaryItem[] }>(API_ROUTES.orders, {
    retries: 2,
  });
  if (!ok || !Array.isArray(data.orders)) return [];
  return limit ? data.orders.slice(0, limit) : data.orders;
}

export async function fetch_addresses(): Promise<AddressesResponse | null> {
  const { ok, data } = await apiGet<AddressesResponse>(API_ROUTES.account.addresses, {
    retries: 2,
  });
  return ok ? data : null;
}

export async function update_account_details(
  payload: AccountDetailsPayload
): Promise<ApiResult<{ success?: boolean; message?: string }>> {
  return apiPost(API_ROUTES.account.details, payload, { retries: 0 });
}

export async function update_address(
  payload: AddressUpdatePayload
): Promise<ApiResult<{ success?: boolean; message?: string }>> {
  return apiPost(API_ROUTES.account.addresses, payload, { retries: 0 });
}

export async function change_password(
  payload: PasswordPayload
): Promise<ApiResult<{ success?: boolean; message?: string }>> {
  return apiPost(API_ROUTES.account.password, payload, { retries: 0 });
}

export async function fetch_order_detail(
  order_id: number
): Promise<OrderDetail | null> {
  const { ok, data } = await apiGet<OrderDetail>(API_ROUTES.order(order_id), {
    retries: 2,
  });
  return ok ? data : null;
}

export type {
  AccountAddress,
  AddressesResponse,
  AccountDetailsPayload,
  PasswordPayload,
  AddressUpdatePayload,
  OrderDetail,
  ApiResult,
};
