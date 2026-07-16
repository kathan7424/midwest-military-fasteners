/**
 * File Name: page.tsx
 * Description: Password reset landing page — reached via the emailed reset link.
 * Developer: KP-184
 * Created Date: 2026-07-14
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import ResetPasswordPanel from "@/components/pages/Auth/ResetPasswordPanel";
import { PUBLIC_ROUTES } from "@/config/routes";
import { requireGuest } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "Set New Password | Midwest Military Fasteners",
  description: "Set a new password for your Midwest Military Fasteners account.",
};

type Props = {
  searchParams: Promise<{ key?: string; login?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  await requireGuest();

  const { key, login } = await searchParams;

  // Both params are required — if either is missing the link is invalid.
  if (!key?.trim() || !login?.trim()) {
    redirect(`${PUBLIC_ROUTES.forgotPassword}?invalid=1`);
  }

  return (
    <section className="bg-white px-5 py-12 lg:py-[150px]">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <ResetPasswordPanel resetKey={key} login={login} />

        <p className="mt-6 text-center text-link text-dark-gray">
          Remembered your password?{" "}
          <Link
            href={PUBLIC_ROUTES.login}
            className="font-semibold text-blue transition-colors hover:text-navy"
          >
            Back to login
          </Link>
        </p>
      </div>
    </section>
  );
}
