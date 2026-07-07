/**
 * File Name: CartPageContent.tsx
 * Description: Full cart page with line items and actions.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import Link from "next/link";
import { FaChevronRight, FaXmark } from "react-icons/fa6";

import { useCartStore } from "@/stores/cart.store";
import { confirmRemoveItem } from "@/utils/notifications";
import { normalizeWpUrl } from "@/utils/url.utils";

export default function CartPageContent() {
  const cart = useCartStore((state) => state.cart);
  const isLoading = useCartStore((state) => state.isLoading);
  const isMutating = useCartStore((state) => state.isMutating);
  const removeItem = useCartStore((state) => state.removeItem);

  if (isLoading) {
    return <p className="text-lg text-dark-gray">Loading your order...</p>;
  }

  if (!cart?.items.length) {
    return (
      <>
        <p className="mb-8 text-lg text-dark-gray">
          Your cart is empty. Browse products to add items to your order.
        </p>
        <Link
          href="/product"
          className="inline-flex items-center gap-2 bg-blue px-6 py-3 text-link font-semibold text-white transition-colors hover:bg-navy"
        >
          Browse Products
        </Link>
      </>
    );
  }

  const handleRemove = async (key: string, label: string) => {
    const confirmed = await confirmRemoveItem(label);

    if (!confirmed) {
      return;
    }

    await removeItem(key);
  };

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-light-gray border border-light-gray bg-white">
        {cart.items.map((item) => (
          <li
            key={item.key}
            className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={normalizeWpUrl(item.url)}
                className="text-lg font-semibold text-blue hover:text-navy"
              >
                {item.sku || item.name}
              </Link>
              <p className="mt-1 text-sm uppercase tracking-wide text-mid-gray">
                QTY {item.quantity}
              </p>
              <p className="mt-2 text-base text-near-black">
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
              <FaXmark size={16} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4 border border-light-gray bg-off-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-mid-gray">
            Subtotal
          </p>
          <p
            className="text-2xl font-bold text-near-black"
            dangerouslySetInnerHTML={{ __html: cart.subtotal }}
          />
        </div>

        {cart.checkout_url ? (
          <a
            href={normalizeWpUrl(cart.checkout_url)}
            className="inline-flex items-center justify-center gap-2 bg-amber px-6 py-3 text-base font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-[#b38600]"
          >
            Checkout
            <FaChevronRight size={14} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
