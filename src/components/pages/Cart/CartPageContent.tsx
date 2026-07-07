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
import CartQuantityControl from "@/components/shared_Ui/CartQuantityControl";
import CartStockNotice from "@/components/shared_Ui/CartStockNotice";
import { getCartItemQuantityControlProps } from "@/utils/cart-stock.utils";
import { normalizeWpUrl } from "@/utils/url.utils";

export default function CartPageContent() {
  const cart = useCartStore((state) => state.cart);
  const isLoading = useCartStore((state) => state.isLoading);
  const isMutating = useCartStore((state) => state.isMutating);
  const updatingItemKey = useCartStore((state) => state.updatingItemKey);
  const updateItem = useCartStore((state) => state.updateItem);
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

  const handleRemove = async (key: string) => {
    await removeItem(key);
  };

  const handleQuantityChange = async (key: string, nextQuantity: number) => {
    await updateItem(key, Math.max(1, nextQuantity));
  };

  return (
    <div className="max-w-[1320px]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-navy text-left text-link font-bold uppercase text-white">
              <th className="px-5 py-4">Part #</th>
              <th className="px-5 py-4">Description</th>
              <th className="px-5 py-4 text-center">Qty</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4 text-center">Remove</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-light-gray border-b border-light-gray">
            {cart.items.map((item) => {
              const quantityProps = getCartItemQuantityControlProps(item);

              return (
              <tr key={item.key}>
                <td className="px-5 py-3 text-link text-blue">
                  <Link href={normalizeWpUrl(item.url)} className="hover:underline">
                    {item.sku || item.name}
                  </Link>
                </td>

                <td className="px-5 py-3 text-near-black">
                  <span className="block max-w-[480px] truncate" title={item.name}>
                    {item.name}
                  </span>
                  <CartStockNotice item={item} className="mt-1 normal-case" />
                </td>

                <td className="px-5 py-3 text-center">
                  <CartQuantityControl
                    quantity={item.quantity}
                    minQuantity={quantityProps.minQuantity}
                    maxQuantity={quantityProps.maxQuantity}
                    editable={quantityProps.editable}
                    disabled={quantityProps.disabled}
                    isUpdating={updatingItemKey === item.key}
                    size="lg"
                    onChange={(nextQuantity) =>
                      handleQuantityChange(item.key, nextQuantity)
                    }
                  />
                </td>

                <td className="px-5 py-3 whitespace-nowrap text-near-black">
                  <span
                    dangerouslySetInnerHTML={{ __html: item.price_html }}
                  />
                </td>

                <td className="px-5 py-3 text-center">
                  <button
                    type="button"
                    disabled={isMutating}
                    aria-label={`Remove ${item.sku || item.name}`}
                    onClick={() => void handleRemove(item.key)}
                    className="text-[#E12222] transition-colors hover:text-red-700 disabled:opacity-50"
                  >
                    <FaXmark size={18} />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-mid-gray">Subtotal</p>
          <p
            className="text-2xl font-bold text-near-black"
            dangerouslySetInnerHTML={{ __html: cart.subtotal }}
          />
        </div>

        {cart.checkout_url ? (
          <Link
            href={normalizeWpUrl(cart.checkout_url)}
            prefetch={false}
            className="inline-flex items-center gap-2.5 bg-amber px-5 py-3 font-semibold uppercase text-link text-white transition-colors hover:bg-blue"
          >
            Checkout
            <FaChevronRight size={12} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
