/**
 * File Name: page.tsx
 * Description: Forgot password page.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { Metadata } from "next";
import Link from "next/link";

import ForgotPasswordPanel from "@/components/pages/Auth/ForgotPasswordPanel";
import { PUBLIC_ROUTES } from "@/config/routes";
import { requireGuest } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "Forgot Password | Midwest Military Fasteners",
  description: "Request a password reset for your Midwest Military Fasteners account.",
};

export default async function ForgotPasswordPage() {
  await requireGuest();

  return (
    <section className="bg-white px-5 py-12 lg:py-[150px]">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <ForgotPasswordPanel />

        <p className="mt-6 text-center text-link text-dark-gray">
          Remembered your password?{" "}
          <Link href={PUBLIC_ROUTES.login} className="font-semibold text-blue transition-colors hover:text-navy">
            Back to login
          </Link>
        </p>
      </div>
    </section>
  );
}
