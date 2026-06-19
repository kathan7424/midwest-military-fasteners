/**
 * File Name: Navbar.tsx
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MenuItem } from "@/types/menu.types";

export default function Navbar() {
  const [menu, setMenu] = useState<MenuItem[]>([]);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });

        if (!res.ok) {
          throw new Error("Menu fetch failed");
        }

        const data: MenuItem[] = await res.json();
        setMenu(data);
      } catch (error) {
        console.error("Menu Error:", error);
      }
    };

    loadMenu();
  }, []);

  if (menu.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Primary navigation">
      <ul className="flex items-center gap-8">
        {menu.map((item) => (
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
