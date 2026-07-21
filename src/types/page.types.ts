/**
 * File Name: page.types.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-26
 */

import { MediaItem } from "@/types/site-settings.types";
import { YoastHeadJson } from "@/types/yoast.types";

export interface WpPage {
  id: number;
  slug: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  featured_media?: number;
  _embedded?: {
    "wp:featuredmedia"?: Array<{
      source_url?: string;
    }>;
  };
  yoast_head_json?: YoastHeadJson;
  /**
   * Shared "Banner Area" ACF fields (register_rest_field, wordpress/inc/api.php)
   * — present for ANY page the field group's Location Rules cover. heading
   * always has a value; WP resolves the page-title fallback server-side.
   */
  mmf_banner?: {
    heading: string;
    sub_heading: string;
    banner_image: MediaItem | null;
  };
}
