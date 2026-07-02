/**
 * File Name: Breadcrumb.tsx
 * Description: Shared breadcrumb trail. Renders links for all items except the
 *              last, which is shown as the bold current page.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import Link from "next/link";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("font-condensed text-link text-blue", className)}
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {isLast || !item.href ? (
                <span className={isLast ? "font-bold text-near-black" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              )}
              {!isLast && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
