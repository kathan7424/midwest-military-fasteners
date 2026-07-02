/**
 * File Name: Header.tsx
 * Description: Logged-out header — 2-row layout with top utility bar (phone,
 *              email, Register, Login) and main row (logo + nav). Responsive.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-24
 */

import Link from "next/link";
import Image from "next/image";
import { FaPhone, FaUser, FaArrowRightToBracket } from "react-icons/fa6";

import Navbar from "../Navbar/Navbar";
import MobileMenu from "../MobileMenu/MobileMenu";
import { fetchMenu } from "@/services/menu.service";
import { MenuItem } from "@/types/menu.types";

export default async function Header() {
  let menu: MenuItem[] = [];

  try {
    menu = await fetchMenu();
  } catch (error) {
    console.error("Menu Error:", error);
  }

  return (
    <header className="bg-white relative shadow-[0_0_10px_rgba(0,0,0,0.05)]">

      {/* ── Top utility bar (desktop only) ── */}
      <div className="hidden lg:block bg-off-white">
        <div className="mx-auto flex items-center justify-end gap-6">

          {/* Phone */}
          <a
            href="tel:3136088280"
            className="flex items-center gap-1.5 text-link text-blue hover:text-navy transition-colors"
          >
            <FaPhone size={13} />
            313.608.8280
          </a>

          {/* Email */}
          <a
            href="mailto:sales@mwmilitary.com"
            className="text-link text-blue uppercase tracking-wide hover:text-navy transition-colors"
          >
            SALES@MWMILITARY.COM
          </a>

          {/* Register + Login — combined blue bar */}
          <div className="flex">
            <Link
              href="/register"
              className="flex items-center gap-[10px] px-5 py-4 bg-blue text-white text-link hover:bg-navy transition-colors"
            >
              <FaUser size={13} />
              REGISTER
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-[10px] px-5 py-4 bg-blue text-white text-link hover:bg-navy transition-colors border-l border-white/20"
            >
              <FaArrowRightToBracket size={13} />
              LOGIN
            </Link>
          </div>

        </div>
      </div>

      {/* ── Main row: Logo + Desktop Nav + Mobile Hamburger ── */}
      <div className="max-w-8xl mx-auto flex items-center justify-between px-5 py-4">

        {/* Logo */}
        <Link href="/" prefetch={false} className="shrink-0 block">
          <Image
            src="/images/midwest-logo.svg"
            alt="Midwest Military Fasteners"
            width={235}
            height={60}
            priority
            className="h-auto max-w-[186px] sm:max-w-full w-[276px]"
          />
        </Link>

        {/* Desktop nav — hidden below lg */}
        <Navbar items={menu} />

        {/* Mobile hamburger — visible below lg */}
        <MobileMenu items={menu} />

      </div>

    </header>
  );
}
