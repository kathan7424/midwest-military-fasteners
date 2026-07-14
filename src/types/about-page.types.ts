import type { MediaItem } from "@/types/site-settings.types";

/** Shared FAQ item — used by AboutAccordion (Quality page). */
export interface AboutPageFaqItem {
  question: string;
  answer: string;
}

/** About Us page: banner + image/content section only (no logo, button, FAQ). */
export interface AboutPageData {
  heading: string;
  sub_heading: string;
  banner_image: MediaItem | null;
  image: MediaItem | null;
  content_heading: string;
  content: string;
}
