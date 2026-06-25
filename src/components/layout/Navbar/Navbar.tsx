/**
 * File Name: Navbar.tsx
 * Description: Desktop navigation links — hidden on mobile, visible from lg breakpoint
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-24
 */

import Link from "next/link";

import { MenuItem } from "@/types/menu.types";

interface NavbarProps {
  items: MenuItem[];
}

export default function Navbar({ items }: NavbarProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Primary navigation" className="hidden lg:flex">
      <ul className="flex items-center gap-8">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.url}
              prefetch={false}
              className="text-near-black font-normal text-body uppercase tracking-wide hover:text-blue transition-colors"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
