/**
 * File Name: page.tsx
 * Description: Registration page.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import type { Metadata } from "next";
import Link from "next/link";

import RegisterPanel from "@/components/pages/Auth/RegisterPanel";
import { requireGuest } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "Register | Midwest Military Fasteners",
  description: "Create your Midwest Military Fasteners account.",
};

export default async function RegisterPage() {
  await requireGuest();

  return (
    <section className="bg-off-white px-5 py-12 lg:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded bg-white p-8 shadow-md lg:p-10">
          <RegisterPanel />
        </div>

        <p className="mt-6 text-center text-sm text-dark-gray">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue transition-colors hover:text-navy"
          >
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}
