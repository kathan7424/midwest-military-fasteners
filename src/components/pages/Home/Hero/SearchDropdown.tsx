"use client";

import Link from "next/link";
import { SearchDropdownProps } from "./types";

export default function SearchDropdown({
  suggestions,
  isOpen,
}: SearchDropdownProps) {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 z-50 w-full overflow-hidden bg-white shadow-xl border border-t-0 border-navy">
      <ul className="p-2">
        {suggestions.map((item, index) => (
          <li key={item.id}>
            <Link
              href="#"
              className="flex items-center gap-1 p-2.5 text-link transition-colors duration-200 hover:bg-off-white"
            >
              <span className="text-amber">
                {item.code}
              </span>

              <span className="text-black">
                {item.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}