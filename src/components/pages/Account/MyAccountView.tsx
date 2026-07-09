/**
 * File Name: MyAccountView.tsx
 * Description: My Account — WooCommerce-standard layout: sidebar navigation +
 *   content panel. Dashboard is the default landing section.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useState } from "react";

import AccountDetailsPanel from "@/components/pages/Account/AccountDetailsPanel";
import AddressesPanel from "@/components/pages/Account/AddressesPanel";
import DashboardPanel from "@/components/pages/Account/DashboardPanel";
import OrderDetailPanel from "@/components/pages/Account/OrderDetailPanel";
import OrderDocumentsPanel from "@/components/pages/Account/OrderDocumentsPanel";
import OrderHistoryPanel from "@/components/pages/Account/OrderHistoryPanel";
import PaymentMethodsPanel from "@/components/pages/Account/PaymentMethodsPanel";
import TaxDocumentsPanel from "@/components/pages/Account/TaxDocumentsPanel";
import LogoutButton from "@/components/pages/Auth/LogoutButton";

export interface AccountUser {
  display_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
}

type SectionKey =
  | "dashboard"
  | "orders"
  | "certifications"
  | "spec-sheets"
  | "addresses"
  | "payment-methods"
  | "account-details"
  | "documents";

const SECTION_TITLES: Record<SectionKey, string> = {
  dashboard: "My Account",
  orders: "Orders",
  certifications: "Certifications",
  "spec-sheets": "Spec Sheets",
  addresses: "Addresses",
  "payment-methods": "Payment Methods",
  "account-details": "Account Details",
  documents: "Documents",
};

const NAV_GROUPS: SectionKey[][] = [
  ["dashboard", "orders", "certifications", "spec-sheets"],
  ["addresses", "payment-methods", "account-details", "documents"],
];


export default function MyAccountView({ user }: { user: AccountUser | null }) {
  const [section, setSection] = useState<SectionKey>("dashboard");
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

  const navigateTo = (target: string) => {
    if (target.startsWith("order:")) {
      const id = parseInt(target.slice(6), 10);
      if (!Number.isNaN(id)) {
        setSection("orders");
        setViewingOrderId(id);
        return;
      }
    }
    setSection(target as SectionKey);
    setViewingOrderId(null);
  };

  const handleViewOrder = (orderId: number) => {
    setViewingOrderId(orderId);
  };

  const handleBackToOrders = () => {
    setViewingOrderId(null);
  };

  const isViewingOrder = viewingOrderId !== null;

  const activeTitle = isViewingOrder
    ? "Order Details"
    : SECTION_TITLES[section];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-8 xl:px-5 xl:py-[40px]">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
        {/* Sidebar */}
        <aside className="h-fit w-full shrink-0 border-2 border-blue bg-white p-5 lg:w-[230px]">
          <h2 className="mb-4 text-body font-bold text-near-black">My Account</h2>

          <nav aria-label="Account sections">
            {NAV_GROUPS.map((group, groupIndex) => (
              <ul
                key={groupIndex}
                className={`space-y-2.5 ${
                  groupIndex > 0 ? "mt-4 border-t border-light-gray pt-4" : ""
                }`}
              >
                {group.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => navigateTo(key)}
                      aria-current={section === key && !isViewingOrder ? "page" : undefined}
                      className={`text-link transition-colors hover:text-blue ${
                        section === key && !isViewingOrder
                          ? "font-semibold text-blue"
                          : "text-amber"
                      }`}
                    >
                      {SECTION_TITLES[key]}
                    </button>
                  </li>
                ))}
              </ul>
            ))}

            <div className="mt-4 border-t border-light-gray pt-4">
              <LogoutButton />
            </div>
          </nav>
        </aside>

        {/* Content panel */}
        <main className="min-w-0 flex-1">
          <h1 className="mb-6 text-h2 font-bold uppercase text-near-black">
            {activeTitle}
          </h1>

          {isViewingOrder ? (
            <OrderDetailPanel
              orderId={viewingOrderId}
              onBack={handleBackToOrders}
            />
          ) : (
            <>
              {section === "dashboard" ? (
                <DashboardPanel user={user} onNavigate={navigateTo} />
              ) : null}
              {section === "orders" ? (
                <OrderHistoryPanel onViewOrder={handleViewOrder} />
              ) : null}
              {section === "certifications" ? (
                <OrderDocumentsPanel filter="certificate" />
              ) : null}
              {section === "spec-sheets" ? (
                <OrderDocumentsPanel filter="spec" />
              ) : null}
              {section === "addresses" ? <AddressesPanel /> : null}
              {section === "payment-methods" ? <PaymentMethodsPanel /> : null}
              {section === "account-details" ? (
                <AccountDetailsPanel user={user} />
              ) : null}
              {section === "documents" ? <TaxDocumentsPanel /> : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
