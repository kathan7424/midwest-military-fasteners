/**
 * File Name: SidebarItem.tsx
 * Description: Individual part-series link inside a sidebar accordion group
 *              (e.g. MS35307, MS35308). Active series is bold/near-black; others
 *              render as amber links.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { SidebarSeries } from "./types";

interface SidebarItemProps {
  series: SidebarSeries;
  active?: boolean;
}

export default function SidebarItem({ series, active = false }: SidebarItemProps) {
  return (
    <li> 
      <Link
        href={series.href}
        // Full prefetch: only the open accordion group's links are mounted,
        // so this pre-renders a handful of series pages and makes clicks instant.
        prefetch
        aria-current={active ? "page" : undefined}
        className={cn(
          "block py-2.5 text-link transition-opacity hover:opacity-75",
          active
            ? "font-bold text-amber no-underline"
            : "text-amber underline underline-offset-1"
        )}
      >
        {series.label}
      </Link>
    </li>
  );
}
