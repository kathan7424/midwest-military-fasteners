/**
 * File Name: SidebarGroup.tsx
 * Description: A single accordion section (e.g. "Hex Cap Screws"). The trigger is
 *              the group label; the panel lists its part-series via SidebarItem.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-07
 */

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
      <AccordionTrigger className="gap-2 px-1 py-3 font-normal text-blue hover:no-underline hover:text-dark-gray">
        {group.label}
      </AccordionTrigger>

      <AccordionContent>
        {hasSeries ? (
          <ul className="px-1">
            {group.series.map((series) => (
              <SidebarItem
                key={series.id}
                series={series}
                active={series.id === activeSeriesId}
              />
            ))}
          </ul>
        ) : null}
      </AccordionContent>
    </AccordionItem>
  );
}
