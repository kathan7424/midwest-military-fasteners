"use client";

/**
 * File Name: MobileMenu.tsx
 * Description: Mobile hamburger menu with slide-down drawer for small screens
 * Developer: KP-184
 * Created Date: 2026-06-24
 * Last Modified: 2026-06-24
 */

import { useState } from "react";
import Link from "next/link";
import { HiMenu, HiX } from "react-icons/hi";
import { FaPhone, FaUser, FaArrowRightToBracket } from "react-icons/fa6";

import { MenuItem } from "@/types/menu.types";

interface MobileMenuProps {
  items: MenuItem[];
}

export default function MobileMenu({ items }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Hamburger / Close button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="text-blue hover:text-blue transition-colors"
      >
        {open ? (
          <HiX className="w-10 h-10" />
        ) : (
          <HiMenu className="w-10 h-10" />
        )}
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-t border-light-gray shadow-lg z-50">
          <nav aria-label="Mobile navigation">
            <ul className="flex flex-col px-4 py-2">

              {/* Nav links */}
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.url}
                    prefetch={false}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-near-black font-semibold text-sm uppercase tracking-wide border-b border-light-gray hover:text-blue transition-colors"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}

              {/* Contact info */}
              <li className="py-3 border-b border-light-gray flex flex-col gap-2">
                <a
                  href="tel:3136088280"
                  className="flex items-center gap-2 text-sm text-dark-gray"
                >
                  <FaPhone size={13} /> 313.608.8280
                </a>
                <a
                  href="mailto:sales@mwmilitary.com"
                  className="text-sm font-medium text-amber uppercase"
                >
                  SALES@MWMILITARY.COM
                </a>
              </li>

              {/* Auth buttons */}
              <li className="pt-4 pb-3 flex gap-3">
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-blue text-white text-link font-semibold hover:bg-navy transition-colors"
                >
                  <FaUser size={13} /> REGISTER
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-blue text-white text-link font-semibold hover:bg-navy transition-colors"
                >
                  <FaArrowRightToBracket size={13} /> LOGIN
                </Link>
              </li>

            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
