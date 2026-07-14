import { ENV } from "@/config/env";
import type { ContactPageData } from "@/types/contact.types";

const IS_DEV = process.env.NODE_ENV === "development";

export async function fetch_contact_page(): Promise<ContactPageData | null> {
  try {
    const response = await fetch(
      `${ENV.WP_SITE_URL}/wp-json/custom/v1/contact-page`,
      {
        ...(IS_DEV
          ? { cache: "no-store" as const }
          : { next: { revalidate: 300, tags: ["contact-page"] } }),
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) return null;

    return (await response.json()) as ContactPageData;
  } catch {
    return null;
  }
}
