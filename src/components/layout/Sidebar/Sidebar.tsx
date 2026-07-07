/**
 * File Name: Sidebar.tsx
 * Description: Product navigation sidebar. Renders top-level category headers
 *              (SCREWS, NUTS, WASHERS); each category's groups are an accordion
 *              of part-series links. Data is injected so mock/API sources are
 *              interchangeable.
 * Developer: pod2
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-30
 */

"use client";

import { Accordion } from "@/components/ui/accordion";
import SidebarGroup from "./SidebarGroup";
import type { SidebarCategory } from "./types";

interface SidebarProps {
  categories?: SidebarCategory[];
  activeGroupId?: string;
  activeSeriesId?: string;
}

export default function Sidebar({
  categories = [],
  activeGroupId,
  activeSeriesId,
}: SidebarProps) {
  return (
    <nav
      aria-label="Product categories"
      className="w-full border-t-6 border-blue bg-off-white p-5 xl:p-6"
    >
      <Accordion
        multiple
        defaultValue={activeGroupId ? [activeGroupId] : []}
      >
        {categories.map((category) => (
          <section key={category.id} className="mb-8 last:mb-0">
            <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
              {category.label}
            </h2>

            {category.groups.map((group) => (
              <SidebarGroup
                key={group.id}
                group={group}
                activeSeriesId={activeSeriesId}
              />
            ))}
          </section>
        ))}
      </Accordion>
    </nav>
  );
}