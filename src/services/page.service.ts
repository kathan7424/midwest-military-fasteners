/**
 * File Name: page.service.ts
 * Description: WordPress CMS page content by slug — ISR cached (60s).
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-08
 */

import { fetchWpJson } from "@/services/wp-api.service";
import { WpPage } from "@/types/page.types";

export async function fetchPageBySlug(slug: string): Promise<WpPage | null> {
  const pages = await fetchWpJson<WpPage[]>(
    `/wp/v2/pages?slug=${encodeURIComponent(slug)}`,
    { mode: "static", revalidate: 60 }
  );

  return pages[0] ?? null;
}
