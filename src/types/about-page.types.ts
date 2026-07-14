import type { LinkField, MediaItem } from "@/types/site-settings.types";

export interface AboutPageFaqItem {
  question: string;
  answer: string;
}

export interface AboutPageData {
  heading: string;
  sub_heading: string;
  banner_image: MediaItem | null;
  image: MediaItem | null;
  content_heading: string;
  content: string;
  logo_image: MediaItem | null;
  button: LinkField | null;
  faq_heading: string;
  faq_description: string;
  faq_list: AboutPageFaqItem[];
}
