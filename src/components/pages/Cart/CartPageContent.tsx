/**
 * File Name: CartPageContent.tsx
 * Description: Dynamic cart table — Figma columns, qty field, responsive layout.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-13
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaChevronRight } from "react-icons/fa6";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { useCartStore } from "@/stores/cart.store";
import CartQtyField from "@/components/shared_Ui/CartQtyField";
import CartStockNotice from "@/components/shared_Ui/CartStockNotice";
import { useSiteConfig } from "@/components/providers/SiteConfigProvider";
import { getCartItemQuantityControlProps } from "@/utils/cart-stock.utils";
import { normalizeWpUrl } from "@/utils/url.utils";
import { apply_coupon, remove_coupon } from "@/services/checkout.client";
import { notifyError, notifySuccess } from "@/utils/notifications";
import type { CartItem } from "@/types/cart.types";

function CartCheckoutButton() {
  return (
    <Link
      href="/checkout"
       className="inline-flex w-auto items-center justify-center gap-2.5 bg-amber px-5 lg:px-[30px] py-3.5 text-link font-semibold uppercase text-white transition-colors hover:bg-blue"
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

export default function CartPageContent({ couponsEnabled }: { couponsEnabled: boolean }) {
  const cart = useCartStore((state) => state.cart);
  const setCart = useCartStore((state) => state.setCart);
  const isLoading = useCartStore((state) => state.isLoading);
  const isMutating = useCartStore((state) => state.isMutating);
  const updatingItemKey = useCartStore((state) => state.updatingItemKey);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const { catalogListingPath } = useSiteConfig();

  const [couponCode, setCouponCode] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

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

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) { setCouponError("Please enter a coupon code."); return; }
    setCouponError("");
    setIsApplyingCoupon(true);
    const { ok, data } = await apply_coupon(code);
    if (ok && "cart" in data) {
      setCart(data.cart);
      setCouponCode("");
      setCouponOpen(false);
      notifySuccess("Coupon applied.");
    } else {
      const msg = ("message" in data && data.message) || "Coupon code is invalid.";
      setCouponError(msg);
    }
    setIsApplyingCoupon(false);
  };

  const handleRemoveCoupon = async (code: string) => {
    setIsApplyingCoupon(true);
    const { ok, data } = await remove_coupon(code);
    if (ok && "cart" in data) {
      setCart(data.cart);
      notifySuccess("Coupon removed.");
    } else {
      notifyError(("message" in data && data.message) || "Could not remove coupon.");
    }
    setIsApplyingCoupon(false);
  };

  const shippingNum = Number(cart?.shipping_total.replace(/[^0-9.-]/g, ""));

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

      {/* Coupon notice — only shown when WooCommerce coupons are enabled */}
      {couponsEnabled && (
        <div className="mt-8 max-w-[1320px]">
          <div className="mb-6 border-l-4 border-amber bg-[#eef6fb] px-4 py-3 text-link text-black sm:px-5">
            <p className="mb-0">
              Have a coupon?{" "}
              <button
                type="button"
                onClick={() => { setCouponOpen((o) => !o); setCouponError(""); }}
                className="font-semibold text-blue underline underline-offset-2 transition-colors hover:text-amber"
              >
                Click here to enter your code
              </button>
            </p>
            {couponOpen ? (
              <div className="mt-3 border-t border-[#c9dcea] pt-3">
                <div className="flex max-w-[420px] gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                    placeholder="Coupon code"
                    className="min-w-0 flex-1 border border-light-gray bg-white px-4 py-2.5 text-link text-near-black outline-none transition-colors focus:border-blue"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleApplyCoupon(); } }}
                  />
                  <button
                    type="button"
                    disabled={isApplyingCoupon}
                    onClick={() => void handleApplyCoupon()}
                    className="shrink-0 bg-amber px-5 py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
                  >
                    {isApplyingCoupon ? "Applying..." : "Apply coupon"}
                  </button>
                </div>
                {couponError ? (
                  <p className="mt-2 text-sm text-[#b81c23]">{couponError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* WooCommerce-style cart totals */}
      <div className="mt-8 flex flex-col gap-6 items-start sm:items-end">
        <dl className="w-full max-w-[360px] space-y-2 border border-light-gray bg-off-white p-5 text-link">
          <div className="flex justify-between">
          <dt className="text-dark-gray font-semibold">Subtotal</dt>
            <dd className="font-semibold text-near-black">{cart.subtotal}</dd>
          </div>
          {couponsEnabled && cart.coupons.map((coupon) => (
            <div key={coupon.code} className="flex justify-between">
              <dt className="text-dark-gray">
                Coupon: <span className="uppercase">{coupon.code}</span>{" "}
                <button
                  type="button"
                  disabled={isApplyingCoupon}
                  onClick={() => void handleRemoveCoupon(coupon.code)}
                  className="text-blue underline underline-offset-2 transition-colors hover:text-amber disabled:opacity-50"
                >
                  [Remove]
                </button>
              </dt>
              <dd className="text-near-black">-{coupon.discount}</dd>
            </div>
          ))}
          {shippingNum > 0 ? (
            <div className="flex justify-between">
              <dt className="text-dark-gray">Shipping</dt>
              <dd className="text-near-black">{cart.shipping_total}</dd>
            </div>
          ) : null}
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
          {shippingNum === 0 ? (
            <p className="pt-1 text-sm text-dark-gray mb-0">
              Shipping calculated at checkout.
            </p>
          ) : null}
        </dl>

        <CartCheckoutButton />
      </div>
    </div>
  );
}
