/**
 * File Name: OrderHistoryPanel.tsx
 * Description: My Account → Orders — table per Figma design with skeleton
 *   loading. Clicking order # or the Action column View opens the order
 *   detail panel. Certificates live in the Certifications tab (per product).
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-13
 */

"use client";

import { useEffect, useState } from "react";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { decodeHtmlEntities } from "@/utils/text.utils";

export interface OrderHistoryItem {
  name: string;
  quantity: number;
}

export interface OrderHistoryEntry {
  order_id: number;
  order_number: string;
  date: string;
  status: string;
  status_label: string;
  total: string;
  payment_method_title: string;
  item_count: number;
  items: OrderHistoryItem[];
  certificates?: string[];
}

const STATUS_COLORS: Record<string, string> = {
  completed:  "bg-[#e6f4ea] text-[#1a7f37]",
  processing: "bg-[#eef6fb] text-[#0e6990]",
  shipped:    "bg-[#eef6fb] text-[#0e6990]",
  cancelled:  "bg-[#fce8e8] text-[#b32d2e]",
  failed:     "bg-[#fce8e8] text-[#b32d2e]",
  "on-hold":  "bg-[#fff4ce] text-[#996800]",
  pending:    "bg-[#fff4ce] text-[#996800]",
  refunded:   "bg-off-white text-dark-gray",
};

function status_badge_class(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] ?? "bg-off-white text-dark-gray";
}

function OrderTableSkeleton() {
  return (
    <div className="overflow-x-auto border border-light-gray" aria-busy="true">
      <table className="w-full border-collapse text-link">
        <thead>
          <tr className="bg-navy text-left text-white">
            <th className="px-4 py-3 font-semibold uppercase">Order</th>
            <th className="px-4 py-3 font-semibold uppercase">Date</th>
            <th className="px-4 py-3 font-semibold uppercase">Status</th>
            <th className="px-4 py-3 font-semibold uppercase">Total</th>
            <th className="px-4 py-3 font-semibold uppercase">Action</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i} className="border-t border-light-gray">
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-20" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-32" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-24" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-28" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-12" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OrderHistoryPanel({
  onViewOrder,
}: {
  onViewOrder?: (orderId: number) => void;
}) {
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/orders", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("orders");
        return response.json();
      })
      .then((data: { orders: OrderHistoryEntry[] }) => setOrders(data.orders ?? []))
      .catch(() => setError("Unable to load your order history."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <OrderTableSkeleton />;
  }

  if (error) {
    return <p className="text-link text-red-600">{error}</p>;
  }

  if (!orders.length) {
    return (
      <p className="text-link text-dark-gray">
        You have not placed any orders yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto max-w-[1320px]">
      <table className="w-full border-collapse text-link [&_td]:align-middle [&_a]:align-middle">
        <thead>
          <tr className="bg-navy text-left text-white">
            <th className="px-4 py-3 font-semibold uppercase">Order</th>
            <th className="px-4 py-3 font-semibold uppercase">Date</th>
            <th className="px-4 py-3 font-semibold uppercase">Status</th>
            <th className="px-4 py-3 font-semibold uppercase">Total</th>
            <th className="px-4 py-3 font-semibold uppercase"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isExpanded = expandedId === order.order_id;

            return (
              <OrderRow
                key={order.order_id}
                order={order}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpandedId(isExpanded ? null : order.order_id)
                }
                onViewOrder={onViewOrder}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrderRow({
  order,
  isExpanded,
  onToggle,
  onViewOrder,
}: {
  order: OrderHistoryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onViewOrder?: (orderId: number) => void;
}) {
  const handleOrderClick = () => {
    if (onViewOrder) {
      onViewOrder(order.order_id);
    } else {
      onToggle();
    }
  };

  return (
    <>
      <tr className="border-t border-light-gray align-middle">
        <td className="px-4 py-3.5">
          <button
            type="button"
            onClick={handleOrderClick}
            className="font-normal text-blue transition-colors hover:text-amber"
          >
            #{order.order_number}
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3.5 text-dark-gray">
          {order.date}
        </td>
        <td className="whitespace-nowrap px-4 py-3.5">
          <span
            className={`inline-flex px-2 py-0.5 text-xs font-semibold uppercase ${status_badge_class(order.status)}`}
          >
            {order.status_label}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3.5">
          <span className="font-bold text-dark-gray min-w-[80px]">{order.total}</span>
          <span className="ml-2.5 text-mid-gray">
            {order.item_count} {order.item_count === 1 ? "item" : "items"}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3.5">
          <button
            type="button"
            onClick={handleOrderClick}
            className="text-blue underline underline-offset-2 transition-colors hover:text-amber"
          >
            View
          </button>
        </td>
      </tr>

      {isExpanded ? (
        <tr className="border-t border-light-gray bg-off-white">
          <td colSpan={5} className="px-4 py-3.5">
            <p className="mb-2 text-sm font-semibold uppercase text-dark-gray">
              Items — paid via {order.payment_method_title || "—"}
            </p>
            <ul className="space-y-1">
              {order.items.map((item) => (
                <li key={`${order.order_id}-${item.name}`} className="text-near-black">
                  {decodeHtmlEntities(item.name)} × {item.quantity}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  );
}
