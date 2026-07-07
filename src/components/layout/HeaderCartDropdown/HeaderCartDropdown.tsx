/**
 * File Name: HeaderCartDropdown.tsx
 * Description: Your Order mini-cart dropdown — Figma design.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaCartShopping,
  FaChevronRight,
  FaXmark,
} from "react-icons/fa6";

import { getCartItemCount, useCartStore } from "@/stores/cart.store";
import CartQuantityControl from "@/components/shared_Ui/CartQuantityControl";
import CartStockNotice from "@/components/shared_Ui/CartStockNotice";
import { getCartItemQuantityControlProps } from "@/utils/cart-stock.utils";
import { normalizeWpUrl } from "@/utils/url.utils";
import { cn } from "@/lib/utils";

interface HeaderCartDropdownProps {
  variant?: "full" | "compact";
  className?: string;
  triggerClassName?: string;
  triggerContent?: ReactNode;
  triggerIcon?: ReactNode;
}

export default function HeaderCartDropdown({
  variant = "full",
  className,
  triggerClassName,
  triggerContent,
  triggerIcon,
}: HeaderCartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const cart = useCartStore((state) => state.cart);
  const isMutating = useCartStore((state) => state.isMutating);
  const updatingItemKey = useCartStore((state) => state.updatingItemKey);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemCount = getCartItemCount(cart);
  const hasItems = itemCount > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePageShow = () => {
      setIsOpen(false);
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const handleRemove = async (key: string) => {
    await removeItem(key);
  };

  const handleQuantityChange = async (key: string, nextQuantity: number) => {
    await updateItem(key, Math.max(1, nextQuantity));
  };

  const triggerClass =
    triggerClassName ||
    (variant === "compact"
      ? "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber bg-white text-amber transition-colors hover:bg-off-white"
      : "flex shrink-0 items-center gap-3 border border-amber bg-white px-4 py-2 transition-colors hover:bg-off-white");

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
            {triggerIcon || <FaCartShopping size={17} />}
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          </>
        ) : (
          triggerContent || (
            <>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber text-sm font-bold text-white">
                {itemCount}
              </span>
              <FaCartShopping size={14} className="text-amber" />
            </>
          )
        )}
        {variant === "full" && !triggerContent ? (
          <span className="text-sm font-bold uppercase tracking-wide text-near-black">
            Your Order
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          {variant === "compact" ? (
            <button
              type="button"
              aria-label="Close cart panel"
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
          ) : null}

          <div
            role="dialog"
            aria-label="Your order"
            className={cn(
              variant === "compact"
                ? "fixed inset-y-0 right-0 z-50 w-[calc(100vw-2rem)] max-w-[520px] overflow-y-auto border-l border-amber bg-white p-4 shadow-2xl lg:hidden"
                : "absolute right-0 top-full z-50 w-[512px] max-w-[calc(100vw-2rem)]"
            )}
          >
            {variant === "compact" ? null : (
              <div className="relative z-[1] ml-auto mt-[-1px] h-[23px] w-[170.2px] border-l border-r border-amber bg-white" />
            )}

            <div
              className={cn(
                variant === "compact"
                  ? ""
                  : "mt-[-1px] border border-amber bg-white p-4 shadow-xl"
              )}
            >
              {variant === "compact" ? (
                <div className="mb-4 flex items-center justify-between border-b border-light-gray pb-3">
                  <h2 className="text-base font-bold uppercase tracking-wide text-near-black">
                    Your Order
                  </h2>
                  <button
                    type="button"
                    aria-label="Close cart panel"
                    onClick={() => setIsOpen(false)}
                    className="text-near-black transition-colors hover:text-blue"
                  >
                    <FaXmark size={18} />
                  </button>
                </div>
              ) : null}

            {hasItems && cart?.items.length ? (
              <div className="max-h-64 divide-y divide-light-gray overflow-y-auto">
                {cart.items.map((item) => {
                  const quantityProps = getCartItemQuantityControlProps(item);

                  return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2.5 text-link"
                  >
                    <div className="w-32 shrink-0 sm:w-44">
                      <Link
                        href={normalizeWpUrl(item.url)}
                        prefetch={false}
                        onClick={() => setIsOpen(false)}
                        className="block truncate text-blue hover:underline"
                      >
                        {item.sku || item.name}
                      </Link>
                      <CartStockNotice item={item} className="mt-1" />
                    </div>

                    <CartQuantityControl
                      quantity={item.quantity}
                      minQuantity={quantityProps.minQuantity}
                      maxQuantity={quantityProps.maxQuantity}
                      editable={quantityProps.editable}
                      disabled={quantityProps.disabled}
                      isUpdating={updatingItemKey === item.key}
                      onChange={(nextQuantity) =>
                        handleQuantityChange(item.key, nextQuantity)
                      }
                    />

                    <div className="flex items-center gap-2 text-right sm:gap-2.5">
                      <span className="text-mid-gray">Price</span>
                      <span
                        className="text-near-black"
                        dangerouslySetInnerHTML={{ __html: item.price_html }}
                      />
                      <button
                        type="button"
                        disabled={isMutating}
                        aria-label={`Remove ${item.sku || item.name}`}
                        onClick={() => void handleRemove(item.key)}
                        className="ml-2.5 text-red-500 transition-colors hover:text-red-600 disabled:opacity-50"
                      >
                        <FaXmark size={18} />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-mid-gray">
                Your cart is currently empty.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-4 xl:mt-[28px]">
              <Link
                href="/cart"
                prefetch={false}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 text-link text-blue transition-colors hover:text-amber"
              >
                <svg
                  className="h-auto w-[18px]"
                  width="16"
                  height="15"
                  viewBox="0 0 16 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 0H3.17188C3.22656 0.328125 3.30859 0.765625 3.41797 1.3125H15.75C15.7227 1.44922 15.2852 3.80078 14.4375 8.3125H4.67578L4.92188 9.625H13.5625V10.9375H3.82812L3.71875 10.3906L2.07812 1.3125H0V0ZM4.45703 7H13.3438L14.1641 2.625H3.66406L4.45703 7ZM5.6875 11.8125C6.42578 11.8125 7 12.3867 7 13.125C7 13.8633 6.42578 14.4375 5.6875 14.4375C4.94922 14.4375 4.375 13.8633 4.375 13.125C4.375 12.3867 4.94922 11.8125 5.6875 11.8125ZM11.8125 11.8125C12.5508 11.8125 13.125 12.3867 13.125 13.125C13.125 13.8633 12.5508 14.4375 11.8125 14.4375C11.0742 14.4375 10.5 13.8633 10.5 13.125C10.5 12.3867 11.0742 11.8125 11.8125 11.8125Z"
                    fill="currentColor"
                  />
                </svg>
                View Cart
              </Link>

              {hasItems && cart?.checkout_url ? (
                <Link
                  href={normalizeWpUrl(cart.checkout_url)}
                  prefetch={false}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 bg-amber px-5 py-3 font-semibold uppercase text-link text-white transition-colors hover:bg-blue"
                >
                  Checkout
                  <svg
                    className="h-auto w-[9px]"
                    width="7"
                    height="11"
                    viewBox="0 0 7 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.20703 5.30469L5.74219 5.76953L1.36719 10.1445L0.902344 10.6094L0 9.67969L0.464844 9.21484L4.375 5.30469L0.464844 1.39453L0 0.929688L0.902344 0L1.36719 0.464844L5.74219 4.83984L6.20703 5.30469Z"
                      fill="white"
                    />
                  </svg>
                </Link>
              ) : (
                <Link
                  href="/product"
                  prefetch={false}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 bg-amber px-5 py-3 font-semibold uppercase text-link text-white transition-colors hover:bg-blue"
                >
                  Start Shopping
                  <svg
                    className="h-auto w-[9px]"
                    width="7"
                    height="11"
                    viewBox="0 0 7 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.20703 5.30469L5.74219 5.76953L1.36719 10.1445L0.902344 10.6094L0 9.67969L0.464844 9.21484L4.375 5.30469L0.464844 1.39453L0 0.929688L0.902344 0L1.36719 0.464844L5.74219 4.83984L6.20703 5.30469Z"
                      fill="white"
                    />
                  </svg>
                </Link>
              )}
            </div>
          </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
