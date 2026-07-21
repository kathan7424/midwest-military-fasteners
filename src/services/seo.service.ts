/**
 * File Name: seo.service.ts
 * Description: Yoast SEO metadata by page slug — ISR cached.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-08
 */

import { fetchWpJsonOptional } from "@/services/wp-api.service";
import { WpPageWithYoast, YoastHeadJson } from "@/types/yoast.types";

/** WP REST post-type base — Yoast adds yoast_head_json to every one of these automatically. */
export type YoastPostType = "pages" | "product";

export async function fetchYoastBySlug(
  slug: string,
  postType: YoastPostType = "pages"
): Promise<YoastHeadJson | null> {
  // Both are core WP REST routes (not the WC Store API) — Yoast's
  // yoast_head_json field is registered on the standard /wp/v2/{post_type}
  // routes for every public post type, including WooCommerce's "product" CPT.
  const route = postType === "product" ? "/wp/v2/product" : "/wp/v2/pages";
  const pages = await fetchWpJsonOptional<WpPageWithYoast[]>(
    `${route}?slug=${encodeURIComponent(slug)}&_fields=yoast_head_json`,
    { mode: "static", revalidate: 300 }
  );

  return pages?.[0]?.yoast_head_json ?? null;
}
