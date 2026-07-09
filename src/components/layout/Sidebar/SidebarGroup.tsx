/**
 * File Name: SidebarGroup.tsx
 * Description: A single accordion section (e.g. "Hex Cap Screws"). The trigger is
 *              the group label; the panel lists its part-series via SidebarItem.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-07
 */

import Link from "next/link";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SidebarItem from "./SidebarItem";
import type { SidebarGroupData } from "./types";

interface SidebarGroupProps {
  group: SidebarGroupData;
  activeGroupId?: string;
  activeSeriesId?: string;
}

export default function SidebarGroup({
  group,
  activeGroupId,
  activeSeriesId,
}: SidebarGroupProps) {
  const hasSeries = group.series.length > 0;
  const isActiveGroup = group.id === activeGroupId;

  if (!hasSeries) {
    return (
      <div className="border-b border-mid-gray/40">
        {group.href ? (
          <Link
            href={group.href}
            className={`block px-1 py-3 font-normal transition-colors hover:text-dark-gray ${
              isActiveGroup ? "font-bold text-near-black" : "text-blue"
            }`}
          >
            {group.label}
          </Link>
        ) : (
          <span
            className={`block px-1 py-3 font-normal ${
              isActiveGroup ? "font-bold text-near-black" : "text-blue"
            }`}
          >
            {group.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <AccordionItem value={group.id} className="border-b border-mid-gray/40">
      <AccordionTrigger
        className={`gap-2 px-1 py-3 font-normal hover:no-underline hover:text-dark-gray ${
          isActiveGroup ? "font-bold text-near-black" : "text-blue"
        }`}
      >
        <span className="flex-1 text-left">{group.label}</span>
      </AccordionTrigger>

      <AccordionContent className="pb-2">
        <ul className="px-1">
          {group.series.map((series) => (
            <SidebarItem
              key={series.id}
              series={series}
              active={series.id === activeSeriesId}
            />
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
}
