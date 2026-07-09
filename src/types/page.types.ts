/**
 * File Name: page.types.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-26
 */

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
}
