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
import IsoSection from "@/components/shared_Ui/IsoSection";

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
    <div className="relative mx-auto w-full overflow-x-clip px-5 py-6 xl:px-5 xl:py-[30px]">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar — Figma design: top 6px blue border, neutral-50 bg */}
        <aside className="h-fit w-full shrink-0 border-t-[6px] border-[#336699] bg-neutral-50 px-[27px] pb-[27px] pt-[23px] lg:w-[295px]">
          <h2 className="mb-[18px] text-xl font-bold text-[#14151c]">My Account</h2>

          <nav aria-label="Account sections">
            <ul className="flex flex-col gap-4">
              {/* Group 1 */}
              {(NAV_GROUPS[0] ?? []).filter((k) => k !== "dashboard").map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => navigateTo(key)}
                    aria-current={section === key && !isViewingOrder ? "page" : undefined}
                    className={`text-lg transition-colors hover:opacity-80 ${
                      section === key && !isViewingOrder
                        ? "font-bold text-[#14151c]"
                        : "text-[#cc9900]"
                    }`}
                  >
                    {SECTION_TITLES[key]}
                  </button>
                </li>
              ))}

              {/* Divider */}
              <li aria-hidden="true">
                <hr className="border-t border-[#CCCACA]" />
              </li>

              {/* Group 2 */}
              {(NAV_GROUPS[1] ?? []).map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => navigateTo(key)}
                    aria-current={section === key && !isViewingOrder ? "page" : undefined}
                    className={`text-lg transition-colors hover:opacity-80 ${
                      section === key && !isViewingOrder
                        ? "font-bold text-[#14151c]"
                        : "text-[#cc9900]"
                    }`}
                  >
                    {SECTION_TITLES[key]}
                  </button>
                </li>
              ))}

              {/* Divider */}
              <li aria-hidden="true">
                <hr className="border-t border-[#CCCACA]" />
              </li>

              {/* Logout */}
              <li>
                <LogoutButton className="text-lg text-[#336699] transition-colors hover:opacity-80" />
              </li>
            </ul>
          </nav>
        </aside>

        {/* Content panel */}
        <main className="flex min-w-0 flex-1 flex-col">
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
          <IsoSection align="left" className="mt-auto pb-[18px] pt-10" />
        </main>
      </div>
    </div>
  );
}
