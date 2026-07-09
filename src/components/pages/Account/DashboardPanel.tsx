/**
 * File Name: DashboardPanel.tsx
 * Description: My Account → Dashboard — WooCommerce-standard overview:
 *   welcome message, recent orders (last 5), billing + shipping address cards.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useEffect, useRef, useState } from "react";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import {
  fetch_orders,
  fetch_addresses,
  type OrderSummaryItem,
  type AddressesResponse,
  type AccountAddress,
} from "@/services/account.client";
import type { AccountUser } from "./MyAccountView";

function AddressSummaryCard({
  title,
  address,
  onEdit,
}: {
  title: string;
  address: AccountAddress;
  onEdit: () => void;
}) {
  const hasAddress = Boolean(address.address_1 || address.city);

  return (
    <div className="border border-light-gray bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-label font-bold uppercase text-near-black">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-semibold text-blue transition-colors hover:text-amber"
        >
          Edit
        </button>
      </div>
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
        <p className="text-link text-dark-gray">
          You have not set up this type of address yet.
        </p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <SkeletonBlock className="h-5 w-64" />
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-full max-w-xl" />
        <SkeletonBlock className="h-4 w-3/4 max-w-lg" />
      </div>
      <div className="border border-light-gray">
        <div className="bg-navy px-4 py-3">
          <SkeletonBlock className="h-4 w-40 bg-navy/50" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-6 border-t border-light-gray px-4 py-3">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="border border-light-gray bg-white p-5 space-y-3">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="border border-light-gray bg-white p-5 space-y-3">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-4 w-48" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

const EMPTY_ADDRESS: AccountAddress = {
  first_name: "",
  last_name: "",
  company: "",
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
  email: "",
  phone: "",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-[#e6f4ea] text-[#1a7f37]",
  processing: "bg-[#eef6fb] text-[#0e6990]",
  shipped: "bg-[#eef6fb] text-[#0e6990]",
  cancelled: "bg-[#fce8e8] text-[#b32d2e]",
  "on-hold": "bg-[#fff4ce] text-[#996800]",
  refunded: "bg-off-white text-dark-gray",
};

function order_status_class(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] ?? "bg-off-white text-dark-gray";
}

export default function DashboardPanel({
  user,
  onNavigate,
}: {
  user: AccountUser | null;
  onNavigate: (section: string) => void;
}) {
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [addresses, setAddresses] = useState<AddressesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    void (async () => {
      const [fetchedOrders, fetchedAddresses] = await Promise.all([
        fetch_orders(5),
        fetch_addresses(),
      ]);
      setOrders(fetchedOrders);
      setAddresses(fetchedAddresses);
      setIsLoading(false);
    })();
  }, []);

  const firstName = user?.first_name || user?.display_name?.split(" ")[0] || "there";

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <p className="text-link text-dark-gray">
        Hello, <span className="font-semibold text-near-black">{firstName}</span>.{" "}
        From your account dashboard you can view your recent orders, manage your
        shipping and billing addresses, and edit your password and account details.
      </p>

      {/* Recent orders */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-label font-bold uppercase text-near-black">
            Recent Orders
          </h2>
          {orders.length > 0 ? (
            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="text-sm font-semibold text-blue transition-colors hover:text-amber"
            >
              View all orders
            </button>
          ) : null}
        </div>

        {orders.length === 0 ? (
          <p className="text-link text-dark-gray">
            You have not placed any orders yet.
          </p>
        ) : (
          <div className="overflow-x-auto border border-light-gray">
            <table className="w-full border-collapse text-link">
              <thead>
                <tr className="bg-navy text-left font-bold uppercase text-white">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id} className="border-t border-light-gray">
                    <td className="px-4 py-3 font-semibold text-amber">
                      #{order.order_number}
                    </td>
                    <td className="px-4 py-3 text-dark-gray">{order.date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold uppercase ${order_status_class(order.status_label)}`}
                      >
                        {order.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-near-black">
                      {order.total}
                      <span className="ml-1 font-normal text-dark-gray">
                        for {order.item_count} item{order.item_count !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onNavigate(`order:${order.order_id}`)}
                        className="text-sm font-semibold text-blue transition-colors hover:text-amber"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Addresses — always shown; empty state handled per-card */}
      <section>
        <h2 className="mb-4 text-label font-bold uppercase text-near-black">
          Addresses
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <AddressSummaryCard
            title="Billing Address"
            address={addresses?.billing ?? EMPTY_ADDRESS}
            onEdit={() => onNavigate("addresses")}
          />
          <AddressSummaryCard
            title="Shipping Address"
            address={addresses?.shipping ?? EMPTY_ADDRESS}
            onEdit={() => onNavigate("addresses")}
          />
        </div>
      </section>
    </div>
  );
}
