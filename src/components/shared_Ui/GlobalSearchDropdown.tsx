/**
 * File Name: GlobalSearchDropdown.tsx
 * Description: Shared search suggestion dropdown for header and hero.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import Link from "next/link";

import { SearchDropdownProps } from "@/types/hero.types";
import { cn } from "@/lib/utils";

interface GlobalSearchDropdownProps extends SearchDropdownProps {
  variant?: "hero" | "header";
}

export default function GlobalSearchDropdown({
  suggestions,
  isOpen,
  isLoading = false,
  variant = "hero",
}: GlobalSearchDropdownProps) {
  if (!isOpen) {
    return null;
  }

  const panelClass = cn(
    "absolute top-[99%] left-0 z-50 w-full overflow-hidden bg-white shadow-xl",
    "max-h-[min(60vh,320px)] overflow-y-auto",
    variant === "hero"
      ? "border border-t-0 border-navy"
      : "border border-t-0 border-navy top-[98%]"
  );

  if (isLoading) {
    return (
      <div className={panelClass}>
        <p className="p-4 text-sm text-mid-gray">Searching...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={panelClass}>
        <p className="p-4 text-sm text-mid-gray">No results found.</p>
      </div>
    );
  }

  return (
    <div className={panelClass}>
      <ul className="p-2">
        {suggestions.map((item) => (
          <li key={item.id}>
            <Link
              href={item.url}
              prefetch={false}
              className="flex items-center gap-4 p-2.5 text-link transition-colors duration-200 hover:bg-off-white"
            >
              {item.code ? (
                <span
                  className={
                    item.type === "product" ? "text-amber" : "text-mid-gray"
                  }
                >
                  {item.code}
                </span>
              ) : null}
              <span className="text-black">{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
