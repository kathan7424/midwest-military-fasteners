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
import { ENV } from "@/config/env";
import { requireGuest } from "@/services/auth.service";
import { RegisterMetaResponse } from "@/types/auth.types";

export const metadata: Metadata = {
  title: "Register | Midwest Military Fasteners",
  description: "Create your Midwest Military Fasteners account.",
};

async function get_register_form_title(): Promise<string> {
  try {
    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/auth/register`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return "Create Your Account";
    }

    const data = (await response.json()) as RegisterMetaResponse;
    return data.title?.trim() || "Create Your Account";
  } catch {
    return "Create Your Account";
  }
}

export default async function RegisterPage() {
  await requireGuest();
  const register_form_title = await get_register_form_title();

  return (
    <section className="bg-white px-5 py-12 lg:py-[150px]">
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded bg-white p-8 shadow-md lg:p-10">
        <RegisterPanel title={register_form_title} />
      </div>

      <p className="mt-6 text-center text-link text-dark-gray">
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
