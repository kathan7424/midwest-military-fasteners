/**
 * File Name: cart.types.ts
 * Description: WooCommerce cart API types.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

export interface CartStockAvailability {
  text: string;
  class: string;
}

export interface CartItemQuantityLimits {
  minimum: number;
  maximum: number;
  multiple_of: number;
  editable: boolean;
}

export interface CartItem {
  key: string;
  product_id: number;
  quantity: number;
  sku: string;
  name: string;
  price: number;
  line_total: number;
  price_html: string;
  url: string;
  quantity_limits?: CartItemQuantityLimits;
  stock_availability?: CartStockAvailability;
  low_stock_remaining?: number | null;
  backorders_allowed?: boolean;
  sold_individually?: boolean;
  is_in_stock?: boolean;
}

export interface CartData {
  items: CartItem[];
  item_count: number;
  subtotal: string;
  total: string;
  checkout_url: string;
  cart_url: string;
}

export interface CartAddResponse {
  message: string;
  cart_item_key: string;
  cart: CartData;
}

export interface CartRemoveResponse {
  message: string;
  cart: CartData;
}

export interface CartErrorResponse {
  message?: string;
  code?: string;
}
