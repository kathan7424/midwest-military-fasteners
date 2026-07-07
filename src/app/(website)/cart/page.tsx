/**
 * File Name: page.tsx
 * Description: Cart / Your Order page — protected route.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import type { Metadata } from "next";

import CartPageContent from "@/components/pages/Cart/CartPageContent";
import { requireAuth } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "Your Order | Midwest Military Fasteners",
  description: "View your Midwest Military Fasteners order.",
};

export default async function CartPage() {
  await requireAuth("/cart");

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="mb-8 text-3xl font-bold text-near-black">Your Order</h1>
      <CartPageContent />
    </div>
  );
}
