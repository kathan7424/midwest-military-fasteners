/**
 * File Name: SidebarGroup.tsx
 * Description: A single accordion section (e.g. "Hex Cap Screws"). The trigger is
 *              the group label; the panel lists its part-series via SidebarItem.
 *              Groups with no series render a non-expandable label.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
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
  /** Id of the active series, for highlighting. */
  activeSeriesId?: string;
}

export default function SidebarGroup({ group, activeSeriesId }: SidebarGroupProps) {
  const hasSeries = group.series.length > 0;

  return (
    <AccordionItem value={group.id} className="border-b border-mid-gray/40">
      {hasSeries ? (
        <AccordionTrigger className="py-3 gap-2 px-1 font-normal text-blue hover:no-underline hover:text-dark-gray">
          {group.label}
        </AccordionTrigger>
      ) : group.href ? (
        <div className="px-1 py-3">
          <Link
            href={group.href}
            className="font-normal text-blue transition-colors hover:text-dark-gray hover:underline"
          >
            {group.label}
          </Link>
        </div>
      ) : (
        <AccordionTrigger
          disabled
          className="py-3 gap-2 px-1 font-normal text-blue hover:no-underline hover:text-dark-gray"
        >
          {group.label}
        </AccordionTrigger>
      )}

      {hasSeries && (
        <AccordionContent>
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
      )}
    </AccordionItem>
  );
}
