/**
 * File Name: HeaderCartDropdown.tsx
 * Description: Your Order mini-cart dropdown — Figma design.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FaCartShopping,
  FaChevronRight,
  FaFaceFrown,
  FaXmark,
} from "react-icons/fa6";

import { getCartItemCount, useCartStore } from "@/stores/cart.store";
import { confirmRemoveItem } from "@/utils/notifications";
import { normalizeWpUrl } from "@/utils/url.utils";
import { cn } from "@/lib/utils";

interface HeaderCartDropdownProps {
  variant?: "full" | "compact";
  className?: string;
}

export default function HeaderCartDropdown({
  variant = "full",
  className,
}: HeaderCartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cart = useCartStore((state) => state.cart);
  const isMutating = useCartStore((state) => state.isMutating);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemCount = getCartItemCount(cart);
  const hasItems = itemCount > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRemove = async (key: string, label: string) => {
    const confirmed = await confirmRemoveItem(label);

    if (!confirmed) {
      return;
    }

    await removeItem(key);
  };

  const triggerClass =
    variant === "compact"
      ? "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber bg-white text-amber transition-colors hover:bg-off-white"
      : "flex shrink-0 items-center gap-3 border border-amber bg-white px-4 py-2 transition-colors hover:bg-off-white";

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Your order, ${itemCount} items`}
        className={triggerClass}
      >
        {variant === "compact" ? (
          <>
            <FaCartShopping size={17} />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          </>
        ) : (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
              {itemCount}
            </span>
            <FaCartShopping size={14} className="text-amber" />
          </>
        )}
        {variant === "full" ? (
          <span className="text-sm font-bold uppercase tracking-wide text-near-black">
            Your Order
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Your order"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,360px)] border border-amber bg-white shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-light-gray px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
              {itemCount}
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wide text-near-black">
              Your Order
            </h2>
          </div>

          {hasItems && cart?.items.length ? (
            <ul className="max-h-64 overflow-y-auto">
              {cart.items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-3 border-b border-light-gray px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={normalizeWpUrl(item.url)}
                      prefetch={false}
                      onClick={() => setIsOpen(false)}
                      className="block truncate text-link font-semibold text-blue hover:text-navy"
                    >
                      {item.sku || item.name}
                    </Link>
                    <p className="mt-1 text-xs uppercase tracking-wide text-mid-gray">
                      QTY {item.quantity}
                    </p>
                    <p className="mt-1 text-sm text-near-black">
                      <span className="text-mid-gray">Price </span>
                      <span
                        className="font-bold"
                        dangerouslySetInnerHTML={{ __html: item.price_html }}
                      />
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isMutating}
                    aria-label={`Remove ${item.sku || item.name}`}
                    onClick={() => void handleRemove(item.key, item.sku || item.name)}
                    className="shrink-0 text-red-500 transition-colors hover:text-red-700 disabled:opacity-50"
                  >
                    <FaXmark size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4a4a4a] text-white">
                <FaFaceFrown size={28} />
              </span>
              <p className="mt-4 text-lg font-bold text-near-black">
                Your cart is currently empty!
              </p>
            </div>
          )}

          <div
            className={cn(
              "px-4 py-3",
              hasItems ? "flex items-center justify-between gap-3" : ""
            )}
          >
            {hasItems ? (
              <Link
                href="/cart"
                prefetch={false}
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue transition-colors hover:text-navy"
              >
                <FaCartShopping size={14} />
                View Cart
              </Link>
            ) : (
              <Link
                href="/product"
                prefetch={false}
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 bg-amber px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-[#b38600]"
              >
                Start Shopping
                <FaChevronRight size={12} />
              </Link>
            )}

            {hasItems && cart?.checkout_url ? (
              <Link
                href={normalizeWpUrl(cart.checkout_url)}
                prefetch={false}
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-2 bg-amber px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-[#b38600]"
              >
                Checkout
                <FaChevronRight size={12} />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
