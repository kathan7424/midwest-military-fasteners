import type { Metadata } from "next";

import { YoastHeadJson } from "@/types/yoast.types";
import { decodeHtmlEntities } from "@/utils/text.utils";

const DEFAULT_TITLE = "Midwest Military Fasteners";
const DEFAULT_DESCRIPTION =
  "Genuine, certified fasteners for your demanding needs.";

/**
 * @param yoast            Per-page Yoast head JSON (title/description/og/robots).
 * @param defaultOgImage    Site-wide fallback (Settings → SEO & Analytics) used
 *                          only when this page has no image of its own —
 *                          Yoast itself still wins whenever it has one.
 */
export function buildYoastMetadata(
  yoast?: YoastHeadJson | null,
  defaultOgImage?: string
): Metadata {
  if (!yoast) {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      ...(defaultOgImage && {
        openGraph: { images: [{ url: defaultOgImage }] },
      }),
    };
  }

  const ogImage = yoast.og_image?.[0]?.url || defaultOgImage;

  return {
    title: decodeHtmlEntities(yoast.title) || DEFAULT_TITLE,
    description: yoast.description || DEFAULT_DESCRIPTION,
    alternates: yoast.canonical
      ? { canonical: yoast.canonical }
      : undefined,
    robots: yoast.robots
      ? {
          index: yoast.robots.index === "index",
          follow: yoast.robots.follow === "follow",
        }
      : undefined,
    openGraph: {
      title: yoast.og_title || decodeHtmlEntities(yoast.title),
      description: yoast.og_description || yoast.description,
      url: yoast.canonical,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
  };
}
