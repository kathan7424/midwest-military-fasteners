/**
 * File Name: account.client.ts
 * Description: Client-side My Account API wrappers.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

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

interface ApiResult<T> {
  ok: boolean;
  data: T;
}

async function api_post<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await response.json()) as T;
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: { message: "Network error." } as T };
  }
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
  try {
    const response = await fetch("/api/orders", { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { orders: OrderSummaryItem[] };
    const orders = data.orders ?? [];
    return limit ? orders.slice(0, limit) : orders;
  } catch {
    return [];
  }
}

export async function fetch_addresses(): Promise<AddressesResponse | null> {
  try {
    const response = await fetch("/api/account/addresses", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as AddressesResponse;
  } catch {
    return null;
  }
}

export async function update_account_details(
  payload: AccountDetailsPayload
): Promise<ApiResult<{ success?: boolean; message?: string }>> {
  return api_post("/api/account/details", payload);
}

export async function update_address(
  payload: AddressUpdatePayload
): Promise<ApiResult<{ success?: boolean; message?: string }>> {
  return api_post("/api/account/addresses", payload);
}

export async function change_password(
  payload: PasswordPayload
): Promise<ApiResult<{ success?: boolean; message?: string }>> {
  return api_post("/api/account/password", payload);
}

export async function fetch_order_detail(
  order_id: number
): Promise<OrderDetail | null> {
  try {
    const response = await fetch(`/api/orders/${order_id}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as OrderDetail;
  } catch {
    return null;
  }
}

export type {
  AccountAddress,
  AddressesResponse,
  AccountDetailsPayload,
  PasswordPayload,
  AddressUpdatePayload,
  OrderDetail,
};
