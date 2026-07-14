import { ENV } from "@/config/env";
import type { QualityPageData } from "@/types/quality-page.types";

export type { QualityPageData };

const IS_DEV = process.env.NODE_ENV === "development";

export async function fetch_quality_page(): Promise<QualityPageData | null> {
  try {
    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/quality-page`,
      {
        ...(IS_DEV
          ? { cache: "no-store" as const }
          : { next: { revalidate: 300, tags: ["quality-page"] } }),
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) return null;

    return (await response.json()) as QualityPageData;
  } catch {
    return null;
  }
}
