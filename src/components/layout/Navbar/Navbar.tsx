"use client";

/**
 * File Name: Navbar.tsx
 * Description: Responsive primary navigation — desktop links and mobile drawer.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-06
 */

import { useState } from "react";
import Link from "next/link";
import {
  FaBars,
  FaXmark,
  FaPhone,
  FaUser,
  FaArrowRightToBracket,
  FaCartShopping,
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
  phone?: string | null;
  email?: string | null;
  registerLink: NavLinkProps;
  loginLink: NavLinkProps;
  showRegister?: boolean;
  showLogin?: boolean;
  isLoggedIn?: boolean;
  hideDesktopNav?: boolean;
}

export default function Navbar({
  items,
  phone,
  email,
  registerLink,
  loginLink,
  showRegister = false,
  showLogin = false,
  isLoggedIn = false,
  hideDesktopNav = false,
}: NavbarProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const closeMenu = () => setOpen(false);
  const hasContact = Boolean(phone || email);
  const hasAuthButtons = showRegister || showLogin;

  return (
    <>
      {!hideDesktopNav ? (
        <nav aria-label="Primary navigation" className="hidden lg:flex">
          <ul className="flex items-center gap-8">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={normalizeWpUrl(item.url)}
                  prefetch={false}
                  className="text-body font-normal uppercase tracking-wide text-near-black transition-colors hover:text-blue"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

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

        {open ? (
          <>
            <button
              type="button"
              aria-label="Close menu overlay"
              onClick={closeMenu}
              className="fixed inset-0 z-[69] bg-black/10"
            />
            <div className="fixed inset-x-4 top-[84px] z-[70] max-h-[calc(100vh-108px)] overflow-y-auto border border-light-gray bg-white shadow-lg">
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

                {hasContact ? (
                  <li className="flex flex-col gap-2 border-b border-light-gray py-3">
                    {phone ? (
                      <a
                        href={`tel:${normalizeTel(phone)}`}
                        className="flex items-center gap-2 text-sm text-dark-gray"
                      >
                        <FaPhone size={13} />
                        {phone}
                      </a>
                    ) : null}
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className="text-sm font-medium uppercase tracking-wide text-amber"
                      >
                        {email}
                      </a>
                    ) : null}
                  </li>
                ) : null}

                {hasAuthButtons && !isLoggedIn ? (
                  <li className="flex gap-3 pb-3 pt-4">
                    {showRegister ? (
                      <Link
                        href={registerLink.href}
                        target={registerLink.target}
                        title={registerLink.title}
                        onClick={closeMenu}
                        className="flex flex-1 items-center justify-center gap-2 bg-blue px-4 py-2 text-link font-semibold text-white transition-colors hover:bg-navy"
                      >
                        <FaUser size={13} />
                        {registerLink.title}
                      </Link>
                    ) : null}
                    {showLogin ? (
                      <Link
                        href={loginLink.href}
                        target={loginLink.target}
                        title={loginLink.title}
                        onClick={closeMenu}
                        className="flex flex-1 items-center justify-center gap-2 bg-blue px-4 py-2 text-link font-semibold text-white transition-colors hover:bg-navy"
                      >
                        <FaArrowRightToBracket size={13} />
                        {loginLink.title}
                      </Link>
                    ) : null}
                  </li>
                ) : null}

                {isLoggedIn ? (
                  <li className="flex flex-col gap-3 pb-3 pt-4">
                    <Link
                      href="/my-account"
                      onClick={closeMenu}
                      className="flex items-center justify-center gap-2 bg-blue px-4 py-3 text-link font-semibold text-white transition-colors hover:bg-navy"
                    >
                      <FaUser size={13} />
                      ACCOUNT
                    </Link>
                    <Link
                      href="/cart"
                      onClick={closeMenu}
                      className="flex items-center justify-center gap-2 border border-amber bg-white px-4 py-3 text-sm font-bold uppercase tracking-wide text-near-black transition-colors hover:bg-off-white"
                    >
                      <FaCartShopping size={14} className="text-amber" />
                      Your Order
                    </Link>
                  </li>
                ) : null}
                </ul>
              </nav>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
