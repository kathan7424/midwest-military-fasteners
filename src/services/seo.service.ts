import { ENV } from "@/config/env";
import { WpPageWithYoast, YoastHeadJson } from "@/types/yoast.types";

export async function fetchYoastBySlug(
  slug: string
): Promise<YoastHeadJson | null> {
  const res = await fetch(
    `${ENV.WP_API}/wp/v2/pages?slug=${encodeURIComponent(slug)}&_=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;

  const pages: WpPageWithYoast[] = await res.json();
  return pages[0]?.yoast_head_json ?? null;
}