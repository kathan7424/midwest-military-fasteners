/**
 * File Name: page.tsx
 * Description: Order-received (thank you) page — WooCommerce-style summary.
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

import type { Metadata } from "next";
import Link from "next/link";
import { FaCircleCheck } from "react-icons/fa6";

export const metadata: Metadata = {
  title: "Order Received | Midwest Military Fasteners",
  description: "Your Midwest Military Fasteners order has been received.",
  // Prevent search engines from indexing or following links on this page —
  // it contains order details that belong only to the customer who placed it.
  robots: "noindex, nofollow",
};

type Props = {
  searchParams: Promise<{
    order_id?: string;
    total?: string;
    method?: string;
    card_brand?: string;
    card_last4?: string;
  }>;
};

/** "visa" → "Visa", "amex" → "American Express" — Stripe brand slugs. */
const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const order_id = params.order_id?.replace(/\D/g, "") ?? "";
  const total = params.total?.trim() ?? "";

  // WC standard: show the card used ("Visa ending in 4242"), not the gateway.
  // Params are sanitized — brand must be a known slug, last4 exactly 4 digits.
  const brand_slug = (params.card_brand ?? "").toLowerCase();
  const brand_label = CARD_BRAND_LABELS[brand_slug] ?? "";
  const last4 = /^\d{4}$/.test(params.card_last4 ?? "") ? params.card_last4 : "";

  const payment_label =
    params.method === "net30"
      ? "Net 30 — Purchase Order"
      : brand_label && last4
        ? `${brand_label} ending in ${last4}`
        : brand_label || "Credit Card";
  const order_date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 min-h-[calc(100vh-var(--header-height,140px)-var(--footer-height,48px))]">
      <div className="text-center">
        <FaCircleCheck
          className="mx-auto mb-6 text-[64px] text-[#8fae1b]"
          aria-hidden="true"
        />

        <h1 className="mb-3 text-h2 font-bold uppercase text-near-black">
          Thank you. Your order has been received.
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-body text-dark-gray">
          A confirmation email is on its way to your inbox.
          Spec sheets and certificates for purchased products are available in your account.
        </p>
      </div>

      {/* WooCommerce-style order overview strip */}
      <ul className="mb-12 grid grid-cols-2 gap-y-6 border border-light-gray bg-off-white p-6 text-center sm:grid-cols-4 sm:divide-x sm:divide-light-gray">
        {order_id ? (
          <li className="px-2">
            <span className="mb-1 block text-sm uppercase tracking-wide text-dark-gray">
              Order number
            </span>
            <span className="block text-link font-bold text-near-black">#{order_id}</span>
          </li>
        ) : null}
        <li className="px-2">
          <span className="mb-1 block text-sm uppercase tracking-wide text-dark-gray">
            Date
          </span>
          <span className="block text-link font-bold text-near-black">{order_date}</span>
        </li>
        {total ? (
          <li className="px-2">
            <span className="mb-1 block text-sm uppercase tracking-wide text-dark-gray">
              Total
            </span>
            <span className="block text-link font-bold text-near-black">{total}</span>
          </li>
        ) : null}
        <li className="px-2">
          <span className="mb-1 block text-sm uppercase tracking-wide text-dark-gray">
            Payment method
          </span>
          <span className="block text-link font-bold text-near-black">
            {payment_label}
          </span>
        </li>
      </ul>

      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/my-account"
          className="inline-flex items-center bg-amber px-8 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue"
        >
          View My Account
        </Link>
        <Link
          href="/product"
          className="inline-flex items-center border border-navy px-8 py-3 text-link font-semibold uppercase text-navy transition-colors hover:bg-navy hover:text-white"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
