/**
 * File Name: CartStockNotice.tsx
 * Description: WooCommerce stock availability message for cart line items.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { CartItem } from "@/types/cart.types";
import {
  getCartItemStockMessage,
  isCartItemInStock,
} from "@/utils/cart-stock.utils";
import { cn } from "@/lib/utils";

interface CartStockNoticeProps {
  item: CartItem;
  className?: string;
}

export default function CartStockNotice({ item, className }: CartStockNoticeProps) {
  const message = getCartItemStockMessage(item);

  if (!message) {
    return null;
  }

  const inStock = isCartItemInStock(item);

  return (
    <p
      role="status"
      className={cn(
        "text-base font-semibold leading-snug",
        inStock ? "text-amber" : "text-red-600",
        className
      )}
    >
      {message}
    </p>
  );
}
