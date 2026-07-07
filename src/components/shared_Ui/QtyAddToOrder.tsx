/**
 * File Name: QtyAddToOrder.tsx
 * Description: QTY input + Add to Order with WooCommerce cart integration.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-07
 */

"use client";

import { useState } from "react";

import { useCartStore } from "@/stores/cart.store";
import { cn } from "@/lib/utils";
import { getProductStockState } from "@/utils/cart-stock.utils";

interface QtyAddToOrderProps {
  productId?: number;
  sku?: string;
  stockStatus?: string;
  stockQuantity?: number | null;
  size?: "sm" | "lg";
  className?: string;
}

export default function QtyAddToOrder({
  productId,
  sku,
  stockStatus,
  stockQuantity,
  size = "sm",
  className,
}: QtyAddToOrderProps) {
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const isLg = size === "lg";
  const stock = getProductStockState(stockStatus, stockQuantity);
  const isOutOfStock = !stock.in_stock;

  const handleAdd = async () => {
    if (isOutOfStock) {
      return;
    }

    const parsedQty = Math.max(1, Number(quantity) || 1);
    setIsSubmitting(true);

    try {
      await addItem({
        productId,
        sku,
        quantity: parsedQty,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOutOfStock) {
    return (
      <div className={cn("flex items-center", className)}>
        <span
          className={cn(
            "inline-flex items-center justify-center bg-off-white font-bold uppercase text-mid-gray",
            isLg
              ? "h-[47px] px-6 font-condensed text-[20px]"
              : "px-3 py-2 text-xs"
          )}
        >
          Out of Stock
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <input
        type="number"
        min={1}
        max={stock.max_quantity}
        value={quantity}
        onChange={(event) => setQuantity(Number(event.target.value))}
        placeholder="QTY"
        aria-label="Quantity"
        className={cn(
          "text-near-black placeholder:text-mid-gray",
          isLg
            ? "h-[47px] w-[115px] border-2 border-[#4F5965] px-3 text-[20px]"
            : "w-16 border border-light-gray px-2 py-1.5 text-sm"
        )}
      />
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void handleAdd()}
        className={cn(
          "bg-amber font-bold uppercase text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
          isLg ? "h-[47px] px-6 font-condensed text-[20px]" : "px-3 py-2 text-xs"
        )}
      >
        {isSubmitting ? "Adding..." : "Add to Order"}
      </button>
    </div>
  );
}
