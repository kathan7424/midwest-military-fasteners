import type { MediaItem } from "@/types/site-settings.types";

export interface ContactPageData {
  heading: string;
  sub_heading: string;
  banner_image: MediaItem | null;
}

export interface ContactFormPayload {
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  message: string;
}
