/**
 * File Name: OrderDetailPanel.tsx
 * Description: My Account → View Order — WooCommerce-standard single order
 *   detail: line items, totals, addresses, payment method.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import {
  fetch_order_detail,
  type AccountAddress,
  type OrderDetail,
} from "@/services/account.client";
import { has_product_document } from "@/utils/spec-parts.utils";

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <SkeletonBlock className="h-6 w-48" />
      <div className="grid grid-cols-4 gap-4 border border-light-gray p-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-5 w-24" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="h-40 w-full" />
      <div className="grid gap-5 sm:grid-cols-2">
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    </div>
  );
}

function AddressBlock({ title, address }: { title: string; address: AccountAddress }) {
  const hasAddress = Boolean(address.address_1 || address.city);

  return (
    <div className="border border-light-gray bg-white p-5">
      <h3 className="mb-3 text-label font-bold uppercase text-near-black">{title}</h3>
      {hasAddress ? (
        <address className="space-y-0.5 text-link not-italic text-dark-gray">
          <p className="font-semibold text-near-black">
            {`${address.first_name} ${address.last_name}`.trim()}
          </p>
          {address.company ? <p>{address.company}</p> : null}
          <p>{address.address_1}</p>
          {address.address_2 ? <p>{address.address_2}</p> : null}
          <p>
            {address.city}, {address.state} {address.postcode}
          </p>
          <p>{address.country}</p>
          {address.email ? <p className="pt-1">{address.email}</p> : null}
          {address.phone ? <p>{address.phone}</p> : null}
        </address>
      ) : (
        <p className="text-link text-dark-gray">N/A</p>
      )}
    </div>
  );
}

export default function OrderDetailPanel({
  orderId,
  onBack,
}: {
  orderId: number;
  onBack: () => void;
}) {
  const [state, setState] = useState<{
    order: OrderDetail | null;
    isLoading: boolean;
    error: string;
  }>({ order: null, isLoading: true, error: "" });

  useEffect(() => {
    let active = true;

    void (async () => {
      const data = await fetch_order_detail(orderId).catch(() => null);
      if (!active) return;

      if (data) {
        setState({ order: data, isLoading: false, error: "" });
      } else {
        setState({ order: null, isLoading: false, error: "Order not found." });
      }
    })();

    return () => { active = false; };
  }, [orderId]);

  const { order, error } = state;
  const isLoading = state.isLoading;

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (error || !order) {
    return (
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-link font-semibold text-blue transition-colors hover:text-amber"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to orders
        </button>
        <p className="text-link text-red-600">{error || "Order not found."}</p>
      </div>
    );
  }

  const isNet30 = order.payment_method === "cod";

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-link font-semibold text-blue transition-colors hover:text-amber"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to orders
      </button>

      <h2 className="mb-6 text-h5 font-bold uppercase text-near-black">
        Order #{order.order_number}
      </h2>

      {/* Order overview strip */}
      <ul className="mb-8 grid grid-cols-2 gap-y-4 border border-light-gray bg-off-white p-5 text-center sm:grid-cols-4 sm:divide-x sm:divide-light-gray">
        <li className="px-2">
          <span className="mb-1 block text-xs uppercase tracking-wide text-dark-gray">Order number</span>
          <span className="block text-link font-bold text-near-black">#{order.order_number}</span>
        </li>
        <li className="px-2">
          <span className="mb-1 block text-xs uppercase tracking-wide text-dark-gray">Date</span>
          <span className="block text-link font-bold text-near-black">{order.date}</span>
        </li>
        <li className="px-2">
          <span className="mb-1 block text-xs uppercase tracking-wide text-dark-gray">Status</span>
          <span className="block text-link font-bold text-near-black">{order.status_label}</span>
        </li>
        <li className="px-2">
          <span className="mb-1 block text-xs uppercase tracking-wide text-dark-gray">Total</span>
          <span className="block text-link font-bold text-near-black">{order.total}</span>
        </li>
      </ul>

      {/* Order note */}
      {order.customer_note ? (
        <div className="mb-6 border-l-4 border-amber bg-[#fffbe6] px-4 py-3 text-link text-near-black">
          <span className="font-semibold">Note:</span> {order.customer_note}
        </div>
      ) : null}

      {/* Line items table */}
      <div className="mb-8 overflow-x-auto border border-light-gray">
        <table className="w-full border-collapse text-link">
          <thead>
            <tr className="bg-navy text-left font-semibold uppercase text-white">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Spec Sheet</th>
              <th className="px-4 py-3 text-center">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {order.line_items.map((item) => (
              <tr key={`${order.order_id}-${item.product_id}-${item.sku}`} className="border-t border-light-gray">
                <td className="px-4 py-3">
                  <span className="font-semibold text-near-black">{item.sku || item.name}</span>
                  {item.sku && item.name !== item.sku ? (
                    <span className="ml-2 text-dark-gray">{item.name}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-center text-near-black">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-semibold text-near-black">{item.total}</td>
                <td className="px-4 py-3 text-center">
                  {has_product_document(item.spec_file_url) ? (
                    <a
                      href={item.spec_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-amber hover:underline"
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Download
                    </a>
                  ) : (
                    <span className="text-mid-gray">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {has_product_document(item.certificate_file_url) ? (
                    <a
                      href={item.certificate_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-amber hover:underline"
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Download
                    </a>
                  ) : (
                    <span className="text-mid-gray">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order totals */}
      <div className="mb-8 border border-light-gray bg-white p-5">
        <h3 className="mb-4 text-label font-bold uppercase text-near-black">Order Totals</h3>
        <dl className="space-y-2 text-link">
          <div className="flex justify-between">
            <dt className="text-dark-gray">Subtotal</dt>
            <dd className="text-near-black">{order.subtotal}</dd>
          </div>
          {order.discount_total && order.discount_total !== "$0.00" ? (
            <div className="flex justify-between">
              <dt className="text-dark-gray">Discount</dt>
              <dd className="text-near-black">-{order.discount_total}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-dark-gray">Shipping</dt>
            <dd className="text-near-black">{order.shipping_total}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-dark-gray">Tax</dt>
            <dd className="text-near-black">{order.tax_total}</dd>
          </div>
          <div className="flex justify-between border-t border-light-gray pt-3 text-body font-bold">
            <dt className="text-near-black">Total</dt>
            <dd className="text-near-black">{order.total}</dd>
          </div>
          <div className="flex justify-between pt-1">
            <dt className="text-dark-gray">Payment method</dt>
            <dd className="text-near-black">
              {isNet30 ? "Net 30 — Purchase Order Terms" : order.payment_method_title}
            </dd>
          </div>
        </dl>
      </div>

      {/* Addresses */}
      <div className="grid gap-5 sm:grid-cols-2">
        <AddressBlock title="Billing Address" address={order.billing_address} />
        <AddressBlock title="Shipping Address" address={order.shipping_address} />
      </div>
    </div>
  );
}
