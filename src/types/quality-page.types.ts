import type { LinkField, MediaItem } from "@/types/site-settings.types";
import type { AboutPageFaqItem } from "@/types/about-page.types";

/** Quality page: banner + content (logo, button) + FAQ section.
 *  Keys mirror the ACF field names on the Quality field group. */
export interface QualityPageData {
  banner_heading: string;
  sub_heading: string;
  banner_image: MediaItem | null;
  image: MediaItem | null;
  section_heading: string;
  content: string;
  logo_image: MediaItem | null;
  button: LinkField | null;
  faq_sec_heading: string;
  faq_description: string;
  faq_list: AboutPageFaqItem[];
}
