"use client";

/**
 * File Name: Navbar.tsx
 * Description: Responsive primary navigation — desktop links and mobile drawer.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-26
 */

import { useState } from "react";
import Link from "next/link";
import {
  FaBars,
  FaXmark,
  FaPhone,
  FaUser,
  FaArrowRightToBracket,
} from "react-icons/fa6";

import { MenuItem } from "@/types/menu.types";
import { normalizeTel, normalizeWpUrl } from "@/utils/url.utils";

interface NavLinkProps {
  href: string;
  target?: string;
  title?: string;
}

interface NavbarProps {
  items: MenuItem[];
  phone: string;
  email: string;
  registerLink: NavLinkProps;
  loginLink: NavLinkProps;
}

export default function Navbar({
  items,
  phone,
  email,
  registerLink,
  loginLink,
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* Desktop navigation */}
      <nav aria-label="Primary navigation" className="hidden lg:flex">
        <ul className="flex items-center gap-8">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={normalizeWpUrl(item.url)}
                prefetch={false}
                className="text-near-black font-normal text-body uppercase tracking-wide hover:text-blue transition-colors"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile navigation */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="text-blue transition-colors hover:text-navy"
        >
          {open ? (
            <FaXmark className="h-10 w-10" />
          ) : (
            <FaBars className="h-10 w-10" />
          )}
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 border-t border-light-gray bg-white shadow-lg">
            <nav aria-label="Mobile navigation">
              <ul className="flex flex-col px-4 py-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={normalizeWpUrl(item.url)}
                      prefetch={false}
                      onClick={closeMenu}
                      className="block border-b border-light-gray py-3 text-sm font-semibold uppercase tracking-wide text-near-black transition-colors hover:text-blue"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}

                <li className="flex flex-col gap-2 border-b border-light-gray py-3">
                  <a
                    href={`tel:${normalizeTel(phone)}`}
                    className="flex items-center gap-2 text-sm text-dark-gray"
                  >
                    <FaPhone size={13} />
                    {phone}
                  </a>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm font-medium uppercase tracking-wide text-amber"
                  >
                    {email}
                  </a>
                </li>

                <li className="flex gap-3 pb-3 pt-4">
                  <Link
                    href={registerLink.href}
                    target={registerLink.target}
                    title={registerLink.title}
                    onClick={closeMenu}
                    className="flex flex-1 items-center justify-center gap-2 bg-blue px-4 py-2 text-link font-semibold text-white transition-colors hover:bg-navy"
                  >
                    <FaUser size={13} />
                    {registerLink.title ?? "REGISTER"}
                  </Link>
                  <Link
                    href={loginLink.href}
                    target={loginLink.target}
                    title={loginLink.title}
                    onClick={closeMenu}
                    className="flex flex-1 items-center justify-center gap-2 bg-blue px-4 py-2 text-link font-semibold text-white transition-colors hover:bg-navy"
                  >
                    <FaArrowRightToBracket size={13} />
                    {loginLink.title ?? "LOGIN"}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </>
  );
}
