/**
 * File Name: sidebarData.ts
 * Description: Temporary mock data for the product navigation Sidebar.
 *              Replace with API/CMS data later — keep the SidebarCategory[] shape.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-30
 */

import type { SidebarCategory } from "./types";

const DUMMY_SERIES = [
  { id: "ms35307", label: "MS35307", href: "#" },
  { id: "ms35308", label: "MS35308", href: "#" },
  { id: "b1821bhf", label: "B1821BHF", href: "#" },
  { id: "ms24693-s", label: "MS24693-S", href: "#" },
  { id: "ms24693-c", label: "MS24693-C", href: "#" },
];

export const SIDEBAR_DATA: SidebarCategory[] = [
  {
    id: "screws",
    label: "SCREWS",
    groups: [
      {
        id: "hex-cap-screws",
        label: "Hex Cap Screws",
        series: [
          { id: "ms35307", label: "MS35307", href: "/screws/hex-cap-screws/ms35307" },
          { id: "ms35308", label: "MS35308", href: "/screws/hex-cap-screws/ms35308" },
          { id: "b1821bhf", label: "B1821BHF", href: "/screws/hex-cap-screws/b1821bhf" },
          { id: "ms24693-s", label: "MS24693-S", href: "/screws/hex-cap-screws/ms24693-s" },
          { id: "ms24693-c", label: "MS24693-C", href: "/screws/hex-cap-screws/ms24693-c" },
        ],
      },
      { id: "socket-head-screws", label: "Socket Head Screws", series: [] },
      { id: "rounded-head-screws", label: "Rounded Head Screws", series: [] },
      { id: "shoulder-screws", label: "Shoulder Screws", series: [] },
    ],
  },

  {
    id: "nuts",
    label: "NUTS",
    groups: [
      {
        id: "hex-nuts",
        label: "Hex Nuts",
        series: DUMMY_SERIES,
      },
      {
        id: "lock-nuts",
        label: "Lock Nuts",
        series: DUMMY_SERIES,
      },
      {
        id: "flange-nuts",
        label: "Flange Nuts",
        series: DUMMY_SERIES,
      },
      {
        id: "coupling-nuts",
        label: "Coupling Nuts",
        series: DUMMY_SERIES,
      },
      {
        id: "cap-nuts",
        label: "Cap Nuts",
        series: DUMMY_SERIES,
      },
      {
        id: "thumb-nuts",
        label: "Thumb Nuts",
        series: DUMMY_SERIES,
      },
    ],
  },

  {
    id: "washers",
    label: "WASHERS",
    groups: [
      {
        id: "flat-washers",
        label: "Flat Washers",
        series: DUMMY_SERIES,
      },
      {
        id: "spring-washers",
        label: "Spring Washers",
        series: DUMMY_SERIES,
      },
      {
        id: "lock-washers",
        label: "Lock Washers",
        series: DUMMY_SERIES,
      },
    ],
  },
];