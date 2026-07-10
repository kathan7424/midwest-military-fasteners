/**
 * File Name: Sidebar.tsx
 * Description: Product navigation sidebar. Renders top-level category headers
 *              (SCREWS, NUTS, WASHERS); each category's groups are an accordion
 *              of part-series links.
 * Developer: pod2
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-10
 */

"use client";

import { useState } from "react";

import { Accordion } from "@/components/ui/accordion";
import SidebarGroup from "./SidebarGroup";
import type { SidebarCategory } from "./types";

interface SidebarProps {
  categories?: SidebarCategory[];
  activeGroupId?: string;
  activeSeriesId?: string;
}

function resolve_openable_group(
  categories: SidebarCategory[],
  groupId?: string
): string | null {
  if (!groupId) {
    return null;
  }

  const group = categories
    .flatMap((category) => category.groups)
    .find((item) => item.id === groupId);

  return group && group.series.length > 0 ? groupId : null;
}

export default function Sidebar({
  categories = [],
  activeGroupId,
  activeSeriesId,
}: SidebarProps) {
  // Single-open accordion across ALL category sections: opening a group
  // closes whichever group was open before, anywhere in the sidebar.
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    resolve_openable_group(categories, activeGroupId)
  );

  // Adopt the new active group on navigation (adjust state during render).
  const [prevActiveGroupId, setPrevActiveGroupId] = useState(activeGroupId);

  if (prevActiveGroupId !== activeGroupId) {
    setPrevActiveGroupId(activeGroupId);
    const next = resolve_openable_group(categories, activeGroupId);
    if (next) {
      setOpenGroup(next);
    }
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Product categories"
      className="w-full border-t-6 border-blue bg-off-white p-5 xl:p-6"
    >
      {categories.map((category) => {
        // Controlled value per section: only the section containing the open
        // group renders it open; every other section renders fully closed.
        const sectionValue =
          openGroup && category.groups.some((group) => group.id === openGroup)
            ? [openGroup]
            : [];

        return (
          <section key={category.id} className="mb-8 last:mb-0">
            <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
              {category.label}
            </h2>

            <Accordion
              value={sectionValue}
              onValueChange={(value) => {
                const items = Array.isArray(value) ? value : [];
                // Newly opened item wins; empty array means the user closed it.
                setOpenGroup(
                  items.length ? String(items[items.length - 1]) : null
                );
              }}
            >
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
