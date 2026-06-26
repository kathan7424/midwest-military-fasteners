import { MediaItem } from "@/types/site-settings.types";

export interface HomePageBanner {
  banner_title: string;
  banner_image: MediaItem | null;
}

export interface HomePageMeta {
  id: number;
  slug: string;
  title: string;
}

export interface HomePageData {
  page: HomePageMeta;
  banner: HomePageBanner;
}