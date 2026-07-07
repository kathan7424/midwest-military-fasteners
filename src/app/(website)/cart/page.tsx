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
    <div className="mx-auto w-full max-w-8xl px-4 py-6 xl:px-5 xl:py-[30px]">
      <h1 className="mb-6 text-h2 font-bold uppercase text-near-black">
        Your Cart
      </h1>
      <CartPageContent />
    </div>
  );
}
