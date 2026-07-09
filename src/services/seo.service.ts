/**
 * File Name: seo.service.ts
 * Description: Yoast SEO metadata by page slug — ISR cached.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-08
 */

import { fetchWpJsonOptional } from "@/services/wp-api.service";
import { WpPageWithYoast, YoastHeadJson } from "@/types/yoast.types";

export async function fetchYoastBySlug(
  slug: string
): Promise<YoastHeadJson | null> {
  const pages = await fetchWpJsonOptional<WpPageWithYoast[]>(
    `/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=yoast_head_json`,
    { mode: "static", revalidate: 300 }
  );

  return pages?.[0]?.yoast_head_json ?? null;
}
