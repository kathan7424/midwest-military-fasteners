/**
 * File Name: hero.data.ts
 * Description: Home hero fallback content and search suggestions.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

import { SearchSuggestion } from "@/types/hero.types";

export const HERO_TITLE =
  "Genuine, certified fasteners for your demanding needs.";

export const HERO_FALLBACK_IMAGE = "/images/hero-bg-banner.webp";

export const SEARCH_PLACEHOLDER = "Search by part # or keywords";

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: 1,
    code: "MS35307-303",
    title: "1/4-20 X 1/2 HEX CAP SCREW STAINLESS STEEL",
  },
  {
    id: 2,
    code: "MS35307-304",
    title: "1/4-20 X 1/2 HEX CAP SCREW STAINLESS STEEL",
  },
  {
    id: 3,
    code: "MS35307-305",
    title: "1/4-20 X 1/2 HEX CAP SCREW STAINLESS STEEL",
  },
];
