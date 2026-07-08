"use client";

/**
 * File Name: MobileMenu.tsx
 * Description: Mobile hamburger menu with full-width slide-down drawer.
 * Developer: KP-184
 * Created Date: 2026-06-24
 * Last Modified: 2026-07-07
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiMenu, HiX } from "react-icons/hi";
import {
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

interface MobileMenuProps {
  items: MenuItem[];
  phone?: string | null;
  email?: string | null;
  registerLink?: NavLinkProps;
  loginLink?: NavLinkProps;
  showRegister?: boolean;
  showLogin?: boolean;
  isLoggedIn?: boolean;
  showMobileCartLink?: boolean;
}

export default function MobileMenu({
  items,
  phone,
  email,
  registerLink = { href: "/register", title: "REGISTER" },
  loginLink = { href: "/login", title: "LOGIN" },
  showRegister = false,
  showLogin = false,
  isLoggedIn = false,
  showMobileCartLink = true,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => setOpen(false);
  const hasContact = Boolean(phone || email);
  const hasAuthButtons = showRegister || showLogin;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePageShow = () => {
      setOpen(false);
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  const menuPanel = open && mounted ? (
    <>
      <div className="absolute top-full left-0 right-0 bg-white border-t border-light-gray shadow-lg z-50">
        
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
                      {registerLink.title ?? "REGISTER"}
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
                      {loginLink.title ?? "LOGIN"}
                    </Link>
                  ) : null}
                </li>
              ) : null}

              {isLoggedIn ? (
                <li className="flex gap-3 pb-3 pt-4">
                  <Link
                    href="/my-account"
                    onClick={closeMenu}
                    className="flex items-center justify-center gap-2 bg-blue px-4 py-3 text-link font-semibold text-white transition-colors hover:bg-navy"
                  >
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M4.5 4C4.5 5.375 5.625 6.5 7 6.5C8.375 6.5 9.5 5.375 9.5 4C9.5 2.625 8.375 1.5 7 1.5C5.625 1.5 4.5 2.625 4.5 4ZM1.5625 16H0L2 9.5H12L14 16H12.4375L10.9062 11H3.09375L1.5625 16ZM7 8C4.78125 8 3 6.21875 3 4C3 1.78125 4.78125 0 7 0C9.21875 0 11 1.78125 11 4C11 6.21875 9.21875 8 7 8Z" fill="currentColor"/></svg>

                    ACCOUNT
                  </Link>
                  {showMobileCartLink ? (
                    <Link
                      href="/cart"
                      onClick={closeMenu}
                      className="flex items-center justify-center gap-2 border border-amber bg-white px-4 py-3 text-sm font-bold uppercase tracking-wide text-near-black transition-colors hover:bg-off-white"
                    >
                      <FaCartShopping size={14} className="text-amber" />
                      Your Order
                    </Link>
                  ) : null}
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
    </>
  ) : null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="text-blue hover:text-blue transition-colors"
      >
        {open ? (
          <HiX className="h-10 w-10" />
        ) : (
          <HiMenu className="h-10 w-10" />
        )}
      </button>

      {menuPanel}
    </div>
  );
}
