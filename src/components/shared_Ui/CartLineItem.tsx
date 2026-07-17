/**
 * File Name: CartLineItem.tsx
 * Description: Shared cart line row with quantity, price, remove, and stock notice.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { FaXmark } from "react-icons/fa6";

import CartStockNotice from "@/components/shared_Ui/CartStockNotice";
import type { CartItem } from "@/types/cart.types";
import { getCartItemQuantityControlProps } from "@/utils/cart-stock.utils";
import { normalizeWpUrl } from "@/utils/url.utils";
import { cn } from "@/lib/utils";

interface CartLineItemProps {
  item: CartItem;
  isMutating?: boolean;
  isUpdating?: boolean;
  skuClassName?: string;
  onClose?: () => void;
  onRemove: (key: string) => void | Promise<void>;
  onQuantityChange: (key: string, quantity: number) => void | Promise<void>;
  quantitySize?: "sm" | "lg";
  className?: string;
}

interface CartQtyInputProps {
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  disabled?: boolean;
  isUpdating?: boolean;
  onChange: (val: number) => void;
}

function CartQtyInput({
  quantity,
  minQuantity,
  maxQuantity,
  disabled,
  isUpdating,
  onChange,
}: CartQtyInputProps) {
  const [local, setLocal] = useState(String(quantity));

  // Sync the input when the server-confirmed quantity changes — state
  // adjustment during render (React-recommended) instead of an effect.
  const [prevQuantity, setPrevQuantity] = useState(quantity);
  if (prevQuantity !== quantity) {
    setPrevQuantity(quantity);
    setLocal(String(quantity));
  }

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < minQuantity) {
      setLocal(String(quantity));
      return;
    }
    const clamped = maxQuantity ? Math.min(parsed, maxQuantity) : parsed;
    const snapped = Math.max(minQuantity, Math.trunc(clamped));
    setLocal(String(snapped));
    if (snapped !== quantity) onChange(snapped);
  };

  return (
    <input
      type="number"
      min={minQuantity}
      max={maxQuantity}
      value={local}
      disabled={disabled || isUpdating}
      placeholder="QTY"
      aria-label="Quantity"
      className="w-16 border border-light-gray px-2 py-1.5 text-sm text-near-black placeholder:text-mid-gray disabled:opacity-50"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter")
          commit((e.target as HTMLInputElement).value);
      }}
    />
  );
}

export default function CartLineItem({
  item,
  isMutating = false,
  isUpdating = false,
  skuClassName,
  onClose,
  onRemove,
  onQuantityChange,
  className,
}: CartLineItemProps) {
  const quantityProps = getCartItemQuantityControlProps(item);

  return (
    <div className={cn("py-2.5 text-link", className)}>
      <div className="flex items-center justify-between gap-2">
        <Link
          href={normalizeWpUrl(item.url)}
          prefetch={false}
          onClick={onClose}
          className={cn(
            "min-w-0 flex-1 truncate text-blue hover:underline",
            skuClassName
          )}
        >
          {item.sku || item.name}
        </Link>

        {item.sold_individually ? (
          <span className="w-16 px-2 py-1.5 text-center text-sm text-near-black">
            {item.quantity}
          </span>
        ) : (
          <CartQtyInput
            quantity={item.quantity}
            minQuantity={quantityProps.minQuantity}
            maxQuantity={quantityProps.maxQuantity}
            disabled={quantityProps.disabled || isMutating}
            isUpdating={isUpdating}
            onChange={(nextQty) => void onQuantityChange(item.key, nextQty)}
          />
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        <span className="hidden text-gray sm:inline">Price</span>
          <span
            className="whitespace-nowrap text-dark-gray"
            dangerouslySetInnerHTML={{ __html: item.price_html }}
          />
          <button
            type="button"
            disabled={isMutating}
            aria-label={`Remove ${item.sku || item.name}`}
            onClick={() => void onRemove(item.key)}
            className="ml-2.5 text-[#E12222] transition-colors hover:text-red-600 disabled:opacity-50"
          >
            <FaXmark size={18} />
          </button>
        </div>
      </div>

      <CartStockNotice item={item} className="mt-1.5 mb-0 normal-case" />
    </div>
  );
}
