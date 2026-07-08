"use client";

/**
 * File Name: Navbar.tsx
 * Description: Responsive primary navigation — desktop links and mobile drawer.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-07
 */

import Link from "next/link";

import MobileMenu from "../MobileMenu/MobileMenu";
import { MenuItem } from "@/types/menu.types";
import { normalizeWpUrl } from "@/utils/url.utils";

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
  showMobileCartLink?: boolean;
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
  showMobileCartLink = true,
}: NavbarProps) {
  if (items.length === 0) {
    return null;
  }

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

  return (
    <>
      {!hideDesktopNav ? (
        <nav aria-label="Primary navigation" className="hidden lg:flex">
          <ul className="flex items-center gap-8">
            {navItems.map((item) => (
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

      <MobileMenu
        items={items}
        phone={phone}
        email={email}
        registerLink={registerLink}
        loginLink={loginLink}
        showRegister={showRegister}
        showLogin={showLogin}
        isLoggedIn={isLoggedIn}
        showMobileCartLink={showMobileCartLink}
      />
    </>
  );
}
