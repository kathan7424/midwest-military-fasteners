/**
 * File Name: CategoryColumn.tsx
 * Description: Single category column in the home hero grid.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-06
 */

import Link from "next/link";

import { CategoryColumnItem } from "@/types/product-catalog.types";

interface CategoryColumnProps {
  title: string;
  items: CategoryColumnItem[];
}

export default function CategoryColumn({
  title,
  items,
}: CategoryColumnProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-[calc(50%-16px)] shrink-0 grow-0 sm:w-[calc(33.33%-22px)] md:w-auto">
      <h3 className="mb-4 whitespace-normal text-[18px] font-bold leading-[1.3] text-white">
        {title}
      </h3>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id ? `product-${item.id}` : `${title}-${item.label}`}>
            <Link
              href={item.href}
              className="relative z-10 inline-block cursor-pointer text-[16px] font-normal leading-[1.97] text-white underline underline-offset-2 transition-opacity duration-300 hover:opacity-75"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
