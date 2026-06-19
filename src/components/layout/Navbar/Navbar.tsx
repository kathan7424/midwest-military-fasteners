/**
 * File Name: Navbar.tsx
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
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
    <nav aria-label="Primary navigation">
      <ul className="flex items-center gap-8">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.url}
              prefetch={false}
              className="font-medium text-gray-700 hover:text-black transition"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
