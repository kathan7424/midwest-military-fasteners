"use client";

/**
 * File Name: MobileMenu.tsx
 * Description: Mobile hamburger menu with full-width slide-down drawer.
 * Developer: KP-184
 * Created Date: 2026-06-24
 * Last Modified: 2026-07-07
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiMenu, HiX } from "react-icons/hi";
import { FaPhone, FaCartShopping } from "react-icons/fa6";

import { MenuItem } from "@/types/menu.types";
import { normalizeTel, normalizeWpUrl } from "@/utils/url.utils";

// Stable no-op store subscription for the hydration-detection snapshot.
const subscribeNoop = () => () => {};

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
  // Hydration-safe "mounted" without setState-in-effect: server snapshot is
  // false, client snapshot is true — flips exactly once after hydration.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const pathname = usePathname();

  // Close the drawer on route change — state adjustment during render
  // (React-recommended) instead of a cascading setState-in-effect.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const closeMenu = () => setOpen(false);
  const hasAboutLink = items.some((item) => {
    const normalizedUrl = normalizeWpUrl(item.url).toLowerCase();
    const slug = item.slug?.toLowerCase();

    return (
      slug === "about" ||
      slug === "about-us" ||
      normalizedUrl === "/about" ||
      normalizedUrl === "/about-us"
    );
  });
  const navItems = hasAboutLink
    ? items
    : [...items, { id: 999999, title: "ABOUT", slug: "about", url: "/about", type: "custom", parent: 0 }];
  const hasContact = Boolean(phone || email);
  const hasAuthButtons = showRegister || showLogin;

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
              {navItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={normalizeWpUrl(item.url)}
                    prefetch={false}
                    onClick={closeMenu}
                    className="block border-b border-light-gray py-3 text-near-black font-normal text-link uppercase hover:text-blue transition-colors"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}

              {hasContact ? (
                <li className="flex flex-col gap-5 border-b border-light-gray py-3">
                  {phone ? (
                    <a
                      href={`tel:${normalizeTel(phone)}`}
                      className="group flex items-center gap-2 text-link text-blue hover:text-amber group-hover:[&_svg]:fill-amber transition-colors"
                    >
                      <svg className="transition-colors" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0 2L4 0L7.03125 4L4.5 6.5C5.53125 8.6875 7.3125 10.4688 9.5 11.5L12 8.96875L16 12L14 16H13.5C6.03125 16 0 9.96875 0 2.5V2Z" fill="currentColor"/></svg>
                      {phone}
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="text-link text-blue uppercase hover:text-amber transition-colors"
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
                      className="flex flex-1 items-center justify-center gap-2 bg-blue px-4 py-3 text-link text-white transition-colors hover:bg-navy"
                    >
                      <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M6.5 7.5C4.4375 7.5 2.75 5.8125 2.75 3.75C2.75 1.6875 4.4375 0 6.5 0C8.5625 0 10.25 1.6875 10.25 3.75C10.25 5.8125 8.5625 7.5 6.5 7.5ZM13 15.75H0L2 9.25H11L13 15.75Z" fill="white"/> </svg> 
                      {registerLink.title ?? "REGISTER"}
                    </Link>
                  ) : null}
                  {showLogin ? (
                    <Link
                      href={loginLink.href}
                      target={loginLink.target}
                      title={loginLink.title}
                      onClick={closeMenu}
                      className="flex flex-1 items-center justify-center gap-2 bg-blue px-4 py-3 text-link text-white transition-colors hover:bg-navy"
                    >
                      <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M11 2H10V0H16V14H10V12H14V2H11ZM10.7188 7.71875L6 12.4062L4.59375 11C4.78125 10.8125 5.78125 9.8125 7.59375 8H0V6H7.59375L4.59375 3L6 1.59375L6.71875 2.28125L10.7188 6.28125L11.4062 7L10.7188 7.71875Z" fill="white"/> </svg> 
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
    <div className="flex lg:hidden">
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
