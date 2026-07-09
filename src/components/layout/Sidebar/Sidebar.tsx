/**
 * File Name: Sidebar.tsx
 * Description: Product navigation sidebar. Renders top-level category headers
 *              (SCREWS, NUTS, WASHERS); each category's groups are an accordion
 *              of part-series links.
 * Developer: pod2
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-07
 */

"use client";

import { useMemo } from "react";

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
  const open_groups = useMemo(() => {
    if (!activeGroupId) {
      return [];
    }

    const active_group = categories
      .flatMap((category) => category.groups)
      .find((group) => group.id === activeGroupId);

    if (active_group && active_group.series.length > 0) {
      return [activeGroupId];
    }

    return [];
  }, [categories, activeGroupId]);

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Product categories"
      className="w-full border-t-6 border-blue bg-off-white p-5 xl:p-6"
    >
      {categories.map((category) => {
        const section_open_groups = category.groups.some(
          (group) =>
            group.id === activeGroupId && group.series.length > 0
        )
          ? open_groups
          : [];

        return (
          <section key={category.id} className="mb-8 last:mb-0">
            <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
              {category.label}
            </h2>

            <Accordion multiple defaultValue={section_open_groups}>
              {category.groups.map((group) => (
                <SidebarGroup
                  key={group.id}
                  group={group}
                  activeGroupId={activeGroupId}
                  activeSeriesId={activeSeriesId}
                />
              ))}
            </Accordion>
          </section>
        );
      })}
    </nav>
  );
}
