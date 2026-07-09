/**
 * File Name: HeaderCart.tsx
 * Description: Header cart button with dynamic hover dropdown preview and cart count.
 * Developer: KP-184
 * Created Date: 2026-07-06
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaChevronRight } from "react-icons/fa6";

import { getCartItemCount, useCartStore } from "@/stores/cart.store";
import CartCountBadge from "@/components/shared_Ui/CartCountBadge";
import CartLineItem from "@/components/shared_Ui/CartLineItem";
import { useSiteConfig } from "@/components/providers/SiteConfigProvider";

export default function HeaderCart() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close the dropdown on navigation (adjust state during render instead of an effect).
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const cart = useCartStore((state) => state.cart);
  const isMutating = useCartStore((state) => state.isMutating);
  const updatingItemKey = useCartStore((state) => state.updatingItemKey);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const itemCount = getCartItemCount(cart);
  const hasItems = itemCount > 0;
  const { catalogListingPath } = useSiteConfig();

  const handleRemove = async (key: string) => {
    await removeItem(key);
  };

  const handleQuantityChange = async (key: string, nextQuantity: number) => {
    await updateItem(key, Math.max(1, nextQuantity));
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    const handlePageShow = () => {
      setOpen(false);
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative mr-[5px] hidden lg:block"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Your order, ${itemCount} items`}
        onClick={() => setOpen((prev) => !prev)}
        className="relative hidden shrink-0 items-center gap-2 rounded-none border border-amber px-[16px] py-[11px] transition-colors lg:flex"
      >
        <CartCountBadge count={itemCount} size="md" />
        <span className="text-link font-bold uppercase text-near-black">
          Your Order
        </span>
      </button>

      <div
        className={`absolute right-0 top-full transition-all duration-200 ${open ? "block" : "hidden"}`}
      >
        <div className="absolute right-0 top-full z-50 w-[512px] max-w-[calc(100vw-2rem)]">
          <div className="relative z-[1] ml-auto mt-[-1px] h-[23px] w-[170.2px] border-l border-r border-amber bg-white" />

          <div className="mt-[-1px] border border-amber bg-white p-4 shadow-xl">
            {hasItems && cart?.items.length ? (
              <div className="max-h-64 divide-y divide-light-gray overflow-y-auto">
                {cart.items.map((item) => (
                  <CartLineItem
                    key={item.key}
                    item={item}
                    isMutating={isMutating}
                    isUpdating={updatingItemKey === item.key}
                    onClose={() => setOpen(false)}
                    onRemove={handleRemove}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-mid-gray">
                Your cart is currently empty.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-4 xl:mt-[28px]">
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
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

              {hasItems ? (
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
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
                  href={catalogListingPath}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 bg-amber px-5 py-3 font-semibold uppercase text-link text-white transition-colors hover:bg-blue"
                >
                  Start Shopping
                  <FaChevronRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}