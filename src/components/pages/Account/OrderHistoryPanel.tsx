/**
 * File Name: OrderHistoryPanel.tsx
 * Description: My Account → Orders — table per Figma design with skeleton
 *   loading. Clicking order # or View opens the order detail panel.
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-09
 */

"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

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

function OrderTableSkeleton() {
  return (
    <div className="overflow-x-auto border border-light-gray" aria-busy="true">
      <table className="w-full border-collapse text-link">
        <thead>
          <tr className="bg-navy text-left text-white">
            <th className="px-4 py-3 font-semibold uppercase">Order</th>
            <th className="px-4 py-3 font-semibold uppercase">Date</th>
            <th className="px-4 py-3 font-semibold uppercase">Status</th>
            <th className="px-4 py-3 font-semibold uppercase">Certifications</th>
            <th className="px-4 py-3 font-semibold uppercase">Total</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i} className="border-t border-light-gray">
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-20" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-32" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-24" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-20" /></td>
              <td className="px-4 py-3.5"><SkeletonBlock className="h-4 w-28" /></td>
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
    <div className="overflow-x-auto border border-light-gray">
      <table className="w-full border-collapse text-link">
        <thead>
          <tr className="bg-navy text-left text-white">
            <th className="px-4 py-3 font-semibold uppercase">Order</th>
            <th className="px-4 py-3 font-semibold uppercase">Date</th>
            <th className="px-4 py-3 font-semibold uppercase">Status</th>
            <th className="px-4 py-3 font-semibold uppercase">Certifications</th>
            <th className="px-4 py-3 font-semibold uppercase">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isExpanded = expandedId === order.order_id;
            const certificates = order.certificates ?? [];

            return (
              <OrderRow
                key={order.order_id}
                order={order}
                certificates={certificates}
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
  certificates,
  isExpanded,
  onToggle,
  onViewOrder,
}: {
  order: OrderHistoryEntry;
  certificates: string[];
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
            className="font-semibold text-blue transition-colors hover:text-amber"
          >
            #{order.order_number}
          </button>
        </td>
        <td className="whitespace-nowrap px-4 py-3.5 text-near-black">
          {order.date}
        </td>
        <td className="whitespace-nowrap px-4 py-3.5 text-near-black">
          {order.status_label}
        </td>
        <td className="whitespace-nowrap px-4 py-3.5">
          {certificates.length > 0 ? (
            <a
              href={certificates[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue transition-colors hover:text-amber"
            >
              <Download className="size-4" aria-hidden="true" />
              Download
              {certificates.length > 1 ? ` (${certificates.length})` : ""}
            </a>
          ) : (
            <span className="text-mid-gray">—</span>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3.5">
          <span className="font-bold text-near-black">{order.total}</span>
          <span className="ml-3 text-dark-gray">
            {order.item_count} {order.item_count === 1 ? "item" : "items"}
          </span>
          <button
            type="button"
            onClick={handleOrderClick}
            className="ml-4 text-blue underline underline-offset-2 transition-colors hover:text-amber"
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
                  {item.name} × {item.quantity}
                </li>
              ))}
            </ul>
            {certificates.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-4">
                {certificates.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue transition-colors hover:text-amber"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    Certificate {index + 1}
                  </a>
                ))}
              </div>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}
