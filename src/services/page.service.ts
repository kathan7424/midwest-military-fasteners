/**
 * File Name: page.service.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { ENV } from "@/config/env";
import { WpPage } from "@/types/page.types";

export async function fetchPageBySlug(slug: string): Promise<WpPage | null> {
  const res = await fetch(
    `${ENV.WP_API}/wp/v2/pages?slug=${encodeURIComponent(slug)}`,
    {
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    throw new Error("Page API failed");
  }

  const pages: WpPage[] = await res.json();

  return pages[0] ?? null;
}
