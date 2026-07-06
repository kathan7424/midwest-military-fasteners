"use client";

<<<<<<< HEAD
import Link from "next/link";
import { SearchDropdownProps } from "./types";
=======
/**
 * File Name: SearchDropdown.tsx
 * Description: Home hero search suggestion dropdown.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

import Link from "next/link";

import { SearchDropdownProps } from "@/types/hero.types";
>>>>>>> upstream/dev

export default function SearchDropdown({
  suggestions,
  isOpen,
}: SearchDropdownProps) {
<<<<<<< HEAD
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 z-50 w-full overflow-hidden bg-white shadow-xl border border-t-0 border-navy">
      <ul className="p-2">
        {suggestions.map((item, index) => (
=======
  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 z-50 w-full overflow-hidden border border-t-0 border-navy bg-white shadow-xl">
      <ul className="p-2">
        {suggestions.map((item) => (
>>>>>>> upstream/dev
          <li key={item.id}>
            <Link
              href="#"
              className="flex items-center gap-1 p-2.5 text-link transition-colors duration-200 hover:bg-off-white"
            >
<<<<<<< HEAD
              <span className="text-amber">
                {item.code}
              </span>

              <span className="text-black">
                {item.title}
              </span>
=======
              <span className="text-amber">{item.code}</span>
              <span className="text-black">{item.title}</span>
>>>>>>> upstream/dev
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> upstream/dev
