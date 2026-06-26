/**
 * File Name: CategoryColumn.tsx
 * Description: Single category column in the home hero grid.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

import Link from "next/link";

interface CategoryColumnProps {
  title: string;
  items: string[];
}

export default function CategoryColumn({
  title,
  items,
}: CategoryColumnProps) {
  return (
    <div className="w-full">
      <h3 className="mb-4 whitespace-normal text-[18px] font-bold leading-[1.3] text-white">
        {title}
      </h3>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${title}-${item}`}>
            <Link
              href="#"
              className="text-[16px] font-normal leading-[1.97] text-white underline underline-offset-2 transition-opacity duration-300 hover:opacity-75"
            >
              {item}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
