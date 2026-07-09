/**
 * File Name: page.tsx
 * Description: My Account page — profile, tax exemption, purchased documents.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

import type { Metadata } from "next";
import Link from "next/link";

import OrderDocumentsPanel from "@/components/pages/Account/OrderDocumentsPanel";
import LogoutButton from "@/components/pages/Auth/LogoutButton";
import { getCurrentUser, requireAuth } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "My Account | Midwest Military Fasteners",
  description: "Manage your Midwest Military Fasteners account.",
};

export default async function MyAccountPage() {
  await requireAuth("/my-account");

  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="mb-6 text-h2 font-bold uppercase text-near-black">My Account</h1>

      {user ? (
        <div className="space-y-3 text-link text-dark-gray">
          <p>
            <span className="font-semibold text-near-black">Name:</span>{" "}
            {user.display_name || `${user.first_name} ${user.last_name}`.trim()}
          </p>
          <p>
            <span className="font-semibold text-near-black">Email:</span>{" "}
            {user.email}
          </p>
          {user.company ? (
            <p>
              <span className="font-semibold text-near-black">Company:</span>{" "}
              {user.company}
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="mt-10 border-t border-light-gray pt-8">
        <h2 className="mb-2 text-h5 font-bold uppercase text-near-black">
          Purchased Product Documents
        </h2>
        <p className="mb-6 max-w-2xl text-link text-dark-gray">
          Download spec sheets and product certificates for items you have purchased.
        </p>
        <OrderDocumentsPanel />
      </section>

      <div className="mt-8">
        <LogoutButton />
      </div>

      <p className="mt-6">
        <Link href="/" className="text-blue underline underline-offset-2">
          Back to home
        </Link>
      </p>
    </div>
  );
}
