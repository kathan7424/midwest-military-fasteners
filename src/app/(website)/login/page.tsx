/**
 * File Name: page.tsx
 * Description: Login page.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import LoginPanel from "@/components/pages/Auth/LoginPanel";
import { requireGuest } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "Login | Midwest Military Fasteners",
  description: "Log in to your Midwest Military Fasteners account.",
};

export default async function LoginPage() {
  await requireGuest();

  return (
    <section className="bg-off-white px-5 py-12 lg:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <Suspense fallback={null}>
          <LoginPanel />
        </Suspense>

        <p className="mt-6 text-center text-sm text-dark-gray">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue transition-colors hover:text-navy"
          >
            Register
          </Link>
        </p>
      </div>
    </section>
  );
}
