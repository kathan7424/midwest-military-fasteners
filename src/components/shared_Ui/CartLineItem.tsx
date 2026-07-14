/**
 * File Name: CartLineItem.tsx
 * Description: Shared cart line row with quantity, price, remove, and stock notice.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import Link from "next/link";
import { FaXmark } from "react-icons/fa6";

import CartQuantityControl from "@/components/shared_Ui/CartQuantityControl";
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

export default function CartLineItem({
  item,
  isMutating = false,
  isUpdating = false,
  skuClassName,
  onClose,
  onRemove,
  onQuantityChange,
  quantitySize = "sm",
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

        <CartQuantityControl
          quantity={item.quantity}
          minQuantity={quantityProps.minQuantity}
          maxQuantity={quantityProps.maxQuantity}
          editable={quantityProps.editable}
          disabled={quantityProps.disabled}
          isUpdating={isUpdating}
          size={quantitySize}
          onChange={(nextQuantity) => onQuantityChange(item.key, nextQuantity)}
        />

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
