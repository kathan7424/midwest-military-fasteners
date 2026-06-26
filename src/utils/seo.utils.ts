import type { Metadata } from "next";
import { YoastHeadJson } from "@/types/yoast.types";

const DEFAULT_TITLE = "Midwest Military Fasteners";
const DEFAULT_DESCRIPTION =
  "Genuine, certified fasteners for your demanding needs.";

function decodeHtml(text: string): string {
  return text
    .replace(/&#8211;/g, "–")
    .replace(/&#8226;/g, "•")
    .replace(/&amp;/g, "&");
}

export function buildYoastMetadata(yoast?: YoastHeadJson | null): Metadata {
  if (!yoast) {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
  }

  const ogImage = yoast.og_image?.[0]?.url;

  return {
    title: decodeHtml(yoast.title) || DEFAULT_TITLE,
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
      title: yoast.og_title || decodeHtml(yoast.title),
      description: yoast.og_description || yoast.description,
      url: yoast.canonical,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
  };
}