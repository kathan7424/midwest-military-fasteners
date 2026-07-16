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
import {
  getProductStockMessage,
  getProductStockState,
} from "@/utils/cart-stock.utils";
import { notifyError, notifyWarning } from "@/utils/notifications";

interface QtyAddToOrderProps {
  productId?: number;
  sku?: string;
  productName?: string;
  stockStatus?: string;
  stockQuantity?: number | null;
  size?: "sm" | "lg";
  className?: string;
}

function clamp_quantity(
  value: number,
  min_quantity: number,
  max_quantity?: number
): number {
  const normalized = Math.max(min_quantity, Number(value) || min_quantity);

  if (max_quantity && max_quantity > 0) {
    return Math.min(normalized, max_quantity);
  }

  return normalized;
}

export default function QtyAddToOrder({
  productId,
  sku,
  productName,
  stockStatus,
  stockQuantity,
  size = "sm",
  className,
}: QtyAddToOrderProps) {
  // Blank by default — the buyer types the quantity they want; nothing is
  // pre-filled. Kept as a string so the field can be genuinely empty.
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const isLg = size === "lg";
  const stock = getProductStockState(stockStatus, stockQuantity);
  const isOutOfStock = !stock.in_stock;

  const handleQuantityChange = (raw_value: string, commit = false) => {
    // Allow clearing the field — an empty box stays empty while typing.
    if (raw_value.trim() === "") {
      setQuantity("");
      return;
    }

    const raw = Number(raw_value);

    if (!Number.isFinite(raw) || raw < 1) {
      setQuantity("");
      return;
    }

    if (stock.max_quantity !== undefined && raw > stock.max_quantity) {
      notifyError(
        `You cannot add that amount to the cart — we have ${stock.max_quantity} in stock.`
      );
      setQuantity(String(stock.max_quantity));
      return;
    }

    const parsed = clamp_quantity(raw, 1, stock.max_quantity);

    if (commit && parsed > Number(quantity || 0)) {
      const message = getProductStockMessage(
        stockStatus,
        stockQuantity,
        parsed
      );

      if (message) {
        notifyWarning(message);
      }
    }

    setQuantity(String(parsed));
  };

  const handleAdd = async () => {
    if (isOutOfStock) {
      notifyError("Sorry, this product is out of stock.");
      return;
    }

    const entered = Number(quantity);

    if (quantity.trim() === "" || !Number.isFinite(entered) || entered < 1) {
      notifyError("Please enter a quantity.");
      return;
    }

    const parsedQty = clamp_quantity(entered, 1, stock.max_quantity);
    const stock_message = getProductStockMessage(
      stockStatus,
      stockQuantity,
      parsedQty
    );

    if (
      stock.max_quantity !== undefined &&
      parsedQty > stock.max_quantity
    ) {
      notifyError(
        stock_message ??
          `You cannot add that amount to the cart — we have ${stock.max_quantity} in stock.`
      );
      setQuantity(String(stock.max_quantity));
      return;
    }

    setIsSubmitting(true);

    try {
      const added = await addItem({
        productId,
        sku,
        productName,
        quantity: parsedQty,
      });

      if (added && stock_message) {
        notifyWarning(stock_message);
      }
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
        value={quantity}
        onChange={(event) => handleQuantityChange(event.target.value)}
        onBlur={(event) => handleQuantityChange(event.target.value, true)}
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
