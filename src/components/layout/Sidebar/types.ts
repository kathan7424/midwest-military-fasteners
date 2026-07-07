/**
 * File Name: types.ts
 * Description: TypeScript interfaces for the product navigation Sidebar.
 *              Shape mirrors the eventual API/CMS payload so mock data can be
 *              swapped for a real source without changing components.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

/** A single part-series link, e.g. "MS35307". */
export interface SidebarSeries {
  /** Stable id / slug, e.g. "ms35307". */
  id: string;
  /** Display label, e.g. "MS35307". */
  label: string;
  /** Link target for the series page. */
  href: string;
}

/** An accordion section, e.g. "Hex Cap Screws" containing series links. */
export interface SidebarGroupData {
  id: string;
  label: string;
  href?: string;
  series: SidebarSeries[];
}

/** A top-level category header, e.g. "SCREWS" containing accordion groups. */
export interface SidebarCategory {
  id: string;
  label: string;
  groups: SidebarGroupData[];
}
