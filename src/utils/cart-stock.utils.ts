/**
 * File Name: cart-stock.utils.ts
 * Description: WooCommerce Store API stock helpers for cart and catalog UI.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { CartItem, CartItemQuantityLimits } from "@/types/cart.types";
import { decodeHtmlEntities } from "@/utils/text.utils";

export const WC_UNLIMITED_MAX_QUANTITY = 9999;

export interface ProductStockState {
  in_stock: boolean;
  stock_status: string;
  stock_quantity: number | null;
  max_quantity?: number;
}

export function normalizeWcMaxQuantity(
  maximum?: number | null
): number | undefined {
  const value = Number(maximum ?? 0);

  if (!Number.isFinite(value) || value <= 0 || value >= WC_UNLIMITED_MAX_QUANTITY) {
    return undefined;
  }

  return value;
}

export function getCartItemMaxQuantity(item: CartItem): number | undefined {
  return normalizeWcMaxQuantity(item.quantity_limits?.maximum);
}

export function isCartItemInStock(item: CartItem): boolean {
  if (item.stock_availability?.class?.includes("out-of-stock")) {
    return false;
  }

  if (item.quantity_limits?.maximum === 0 && !item.backorders_allowed) {
    return false;
  }

  if (item.is_in_stock === false) {
    return false;
  }

  return true;
}

export function isCartQuantityEditable(item: CartItem): boolean {
  if (item.sold_individually) {
    return false;
  }

  return item.quantity_limits?.editable !== false;
}

export function getCartItemStockMessage(item: CartItem): string | null {
  if (item.stock_availability?.text) {
    return decodeHtmlEntities(item.stock_availability.text);
  }

  if (!isCartItemInStock(item)) {
    return "Out of stock";
  }

  if (
    item.low_stock_remaining !== null &&
    item.low_stock_remaining !== undefined &&
    item.low_stock_remaining > 0
  ) {
    return `Only ${item.low_stock_remaining} left in stock`;
  }

  return null;
}

export function getProductStockState(
  stock_status?: string,
  stock_quantity?: number | null
): ProductStockState {
  const status = stock_status || "instock";
  const in_stock = status === "instock" || status === "onbackorder";
  const quantity =
    stock_quantity === null || stock_quantity === undefined
      ? null
      : Number(stock_quantity);

  return {
    in_stock,
    stock_status: status,
    stock_quantity: Number.isFinite(quantity) ? quantity : null,
    max_quantity:
      in_stock && quantity !== null && quantity > 0 ? quantity : undefined,
  };
}

export function mapStoreQuantityLimits(
  limits?: Partial<CartItemQuantityLimits>
): CartItemQuantityLimits | undefined {
  if (!limits) {
    return undefined;
  }

  return {
    minimum: Number(limits.minimum ?? 1) || 1,
    maximum: Number(limits.maximum ?? 0) || 0,
    multiple_of: Number(limits.multiple_of ?? 1) || 1,
    editable: limits.editable !== false,
  };
}

export function getCartItemQuantityControlProps(item: CartItem) {
  return {
    minQuantity: item.quantity_limits?.minimum ?? 1,
    maxQuantity: getCartItemMaxQuantity(item),
    editable: isCartQuantityEditable(item),
    disabled: !isCartItemInStock(item),
  };
}
