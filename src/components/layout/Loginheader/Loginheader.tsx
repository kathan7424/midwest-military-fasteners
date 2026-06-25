/**
 * File Name: Loginheader.tsx
 * Description: Logged-in header — 2-row layout. Top bar: nav + phone + email +
 *              Account button. Main row: logo + search bar + Your Order button.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-24
 */

import Link from "next/link";
import Image from "next/image";
import { FiPhone, FiUser, FiShoppingCart } from "react-icons/fi";

import { fetchMenu } from "@/services/menu.service";
import { MenuItem } from "@/types/menu.types";
import { normalizeMenu } from "@/utils/menu.utils";

export default async function Loginheader() {
  let menu: MenuItem[] = [];

  try {
    menu = await normalizeMenu(await fetchMenu());
  } catch (error) {
    console.error("Menu Error:", error);
  }

  return (
    <header className="bg-white border-b border-light-gray relative">

      {/* ── Top bar: Nav + contact + Account ── */}
      <div className="hidden lg:block border-b border-light-gray bg-off-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2">

          {/* Left: nav links */}
          <nav aria-label="Top navigation">
            <ul className="flex items-center gap-6">
              {menu.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.url}
                    prefetch={false}
                    className="text-near-black font-semibold text-sm uppercase tracking-wide hover:text-blue transition-colors"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right: phone + email + Account */}
          <div className="flex items-center gap-6">
            <a
              href="tel:3136088280"
              className="flex items-center gap-1.5 text-sm text-dark-gray hover:text-navy transition-colors"
            >
              <FiPhone size={13} />
              313.608.8280
            </a>
            <a
              href="mailto:sales@mwmilitary.com"
              className="text-sm font-medium text-amber uppercase tracking-wide hover:text-amber/80 transition-colors"
            >
              SALES@MWMILITARY.COM
            </a>
            <Link
              href="/account"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue text-white text-sm font-semibold rounded hover:bg-blue/90 transition-colors"
            >
              <FiUser size={13} />
              ACCOUNT
            </Link>
          </div>

        </div>
      </div>

      {/* ── Main row: Logo + Search bar + Your Order ── */}
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 py-4">

        {/* Logo */}
        <Link href="/" prefetch={false} className="shrink-0 block">
          <Image
            src="/images/midwest-logo.svg"
            alt="Midwest Military Fasteners"
            width={180}
            height={60}
            priority
          />
        </Link>

        {/* Search bar */}
        <form
          action="/catalog"
          method="GET"
          className="hidden lg:flex flex-1 max-w-xl items-center"
        >
          <div className="flex w-full border border-light-gray rounded overflow-hidden">
            <input
              type="text"
              name="q"
              placeholder="Search by part # or keywords"
              className="flex-1 px-4 py-2 text-sm text-near-black placeholder:text-mid-gray outline-none bg-white"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-amber text-white hover:bg-amber/90 transition-colors"
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Your Order button */}
        <Link
          href="/cart"
          className="hidden lg:flex items-center gap-2 px-5 py-2 bg-amber text-white text-sm font-semibold rounded hover:bg-amber/90 transition-colors shrink-0"
        >
          <FiShoppingCart size={15} />
          YOUR ORDER
        </Link>

      </div>

    </header>
  );
}
