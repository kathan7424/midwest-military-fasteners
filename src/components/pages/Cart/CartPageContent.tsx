/**
 * File Name: CartPageContent.tsx
 * Description: Dynamic cart table — Figma columns, qty field, responsive layout.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa6";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { useCartStore } from "@/stores/cart.store";
import CartQtyField from "@/components/shared_Ui/CartQtyField";
import CartStockNotice from "@/components/shared_Ui/CartStockNotice";
import { useSiteConfig } from "@/components/providers/SiteConfigProvider";
import { getCartItemQuantityControlProps } from "@/utils/cart-stock.utils";
import { normalizeWpUrl } from "@/utils/url.utils";
import type { CartItem } from "@/types/cart.types";

function CartCheckoutButton() {
  return (
    <Link
      href="/checkout"
      className="inline-flex w-full items-center justify-center gap-2.5 bg-amber px-5 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue sm:w-auto"
    >
      Checkout
      <FaChevronRight size={12} aria-hidden="true" />
    </Link>
  );
}

function CartRemoveButton({
  item,
  isMutating,
  onRemove,
}: {
  item: CartItem;
  isMutating: boolean;
  onRemove: (key: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={isMutating}
      aria-label={`Remove ${item.sku || item.name}`}
      onClick={() => onRemove(item.key)}
      className="text-[28px] leading-none text-[#E12222] transition-colors hover:text-red-700 disabled:opacity-50"
    >
      ×
    </button>
  );
}

function CartDesktopRow({
  item,
  index,
  isMutating,
  updatingItemKey,
  onRemove,
  onQuantityChange,
}: {
  item: CartItem;
  index: number;
  isMutating: boolean;
  updatingItemKey: string | null;
  onRemove: (key: string) => void;
  onQuantityChange: (key: string, quantity: number) => void;
}) {
  const quantityProps = getCartItemQuantityControlProps(item);

  return (
    <tr className={index % 2 === 0 ? "bg-white" : "bg-white"}>
      <td className="px-4 py-2.5 text-link sm:px-5">
        <Link
          href={normalizeWpUrl(item.url)}
          className="font-normal text-blue hover:underline"
        >
          {item.sku || item.name}
        </Link>
      </td>

      <td className="px-4 py-2.5 uppercase text-near-black sm:px-5">
        <span className="block max-w-[520px]" title={item.name}>
          {item.name}
        </span>
        <CartStockNotice item={item} className="mt-1 normal-case" />
      </td>

      <td className="px-4 py-2.5 text-center sm:px-5">
        <CartQtyField
          quantity={item.quantity}
          minQuantity={quantityProps.minQuantity}
          maxQuantity={quantityProps.maxQuantity}
          editable={quantityProps.editable}
          disabled={quantityProps.disabled}
          isUpdating={updatingItemKey === item.key}
          onChange={(nextQuantity) => onQuantityChange(item.key, nextQuantity)}
        />
      </td>

      <td className="px-4 py-2.5 whitespace-nowrap text-near-black sm:px-5">
        <span dangerouslySetInnerHTML={{ __html: item.price_html }} />
      </td>

      <td className="px-4 py-2.5 text-center sm:px-5">
        <CartRemoveButton
          item={item}
          isMutating={isMutating}
          onRemove={onRemove}
        />
      </td>
    </tr>
  );
}

function CartMobileCard({
  item,
  isMutating,
  updatingItemKey,
  onRemove,
  onQuantityChange,
}: {
  item: CartItem;
  isMutating: boolean;
  updatingItemKey: string | null;
  onRemove: (key: string) => void;
  onQuantityChange: (key: string, quantity: number) => void;
}) {
  const quantityProps = getCartItemQuantityControlProps(item);

  return (
    <article className="border border-light-gray bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={normalizeWpUrl(item.url)}
            className="text-link font-normal text-blue hover:underline"
          >
            {item.sku || item.name}
          </Link>
          <p className="mt-1 text-sm uppercase leading-snug text-near-black">
            {item.name}
          </p>
          <CartStockNotice item={item} className="mt-1.5 normal-case" />
        </div>

        <CartRemoveButton
          item={item}
          isMutating={isMutating}
          onRemove={onRemove}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <CartQtyField
          quantity={item.quantity}
          minQuantity={quantityProps.minQuantity}
          maxQuantity={quantityProps.maxQuantity}
          editable={quantityProps.editable}
          disabled={quantityProps.disabled}
          isUpdating={updatingItemKey === item.key}
          onChange={(nextQuantity) => onQuantityChange(item.key, nextQuantity)}
        />

        <div
          className="text-right text-link font-semibold text-near-black"
          dangerouslySetInnerHTML={{ __html: item.price_html }}
        />
      </div>
    </article>
  );
}

export default function CartPageContent() {
  const cart = useCartStore((state) => state.cart);
  const isLoading = useCartStore((state) => state.isLoading);
  const isMutating = useCartStore((state) => state.isMutating);
  const updatingItemKey = useCartStore((state) => state.updatingItemKey);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const { catalogListingPath } = useSiteConfig();

  // Revalidate on the cart page: cached cart renders instantly, this refresh
  // runs in the background (stale-while-revalidate).
  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  // cart === null means the very first fetch has not resolved yet — show a
  // neutral skeleton (no table header, the cart may turn out to be empty).
  if (isLoading || cart === null) {
    return (
      <div className="max-w-[1320px] space-y-3" aria-busy="true">
        <SkeletonBlock className="h-4 w-full max-w-[560px]" />
        <SkeletonBlock className="h-4 w-full max-w-[440px]" />
        <SkeletonBlock className="h-4 w-full max-w-[500px]" />
        <div className="pt-5">
          <SkeletonBlock className="h-12 w-full max-w-[240px]" />
        </div>
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div className="max-w-[1320px]">
        <p className="mb-6 max-w-xl text-body text-dark-gray sm:mb-8">
          Your cart is empty. Browse products to add items to your order.
        </p>
        <Link
          href={catalogListingPath}
          className="inline-flex w-full max-w-[320px] items-center justify-center gap-2.5 bg-amber px-8 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue sm:min-w-[240px] sm:max-w-none sm:w-auto"
        >
          Browse Products
          <FaChevronRight size={12} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const handleRemove = (key: string) => {
    void removeItem(key);
  };

  const handleQuantityChange = async (key: string, nextQuantity: number) => {
    await updateItem(key, Math.max(1, nextQuantity));
  };

  return (
    <div className="w-full max-w-[1320px]">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="bg-navy text-left text-link font-bold uppercase text-white">
              <th className="px-5 py-4">Part #</th>
              <th className="px-5 py-4">Description</th>
              <th className="px-5 py-4 text-center">Qty</th>
              <th className="px-5 py-4" aria-hidden="true" />
              <th className="px-5 py-4" aria-hidden="true" />
            </tr>
          </thead>

          <tbody className="divide-y divide-light-gray border-b border-light-gray">
            {cart.items.map((item, index) => (
              <CartDesktopRow
                key={item.key}
                item={item}
                index={index}
                isMutating={isMutating}
                updatingItemKey={updatingItemKey}
                onRemove={handleRemove}
                onQuantityChange={(key, qty) => void handleQuantityChange(key, qty)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {cart.items.map((item) => (
          <CartMobileCard
            key={item.key}
            item={item}
            isMutating={isMutating}
            updatingItemKey={updatingItemKey}
            onRemove={handleRemove}
            onQuantityChange={(key, qty) => void handleQuantityChange(key, qty)}
          />
        ))}
      </div>

      {/* WooCommerce-style cart totals */}
      <div className="mt-8 flex flex-col items-stretch gap-6 sm:items-end">
        <dl className="w-full max-w-[360px] space-y-2 border border-light-gray bg-off-white p-5 text-link">
          <div className="flex justify-between">
            <dt className="text-dark-gray">Subtotal</dt>
            <dd className="font-semibold text-near-black">{cart.subtotal}</dd>
          </div>
          {Number(cart.tax_total.replace(/[^0-9.-]/g, "")) > 0 ? (
            <div className="flex justify-between">
              <dt className="text-dark-gray">Taxes</dt>
              <dd className="text-near-black">{cart.tax_total}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-light-gray pt-3 text-body font-bold">
            <dt className="text-near-black">Estimated total</dt>
            <dd className="text-near-black">{cart.total}</dd>
          </div>
          <p className="pt-1 text-sm text-dark-gray">
            Shipping calculated at checkout.
          </p>
        </dl>

        <CartCheckoutButton />
      </div>
    </div>
  );
}
