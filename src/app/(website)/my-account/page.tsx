/**
 * File Name: page.tsx
 * Description: My Account page — protected route.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import type { Metadata } from "next";
import Link from "next/link";

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
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="mb-6 text-3xl font-bold text-near-black">My Account</h1>

      {user ? (
        <div className="space-y-3 text-lg text-dark-gray">
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
