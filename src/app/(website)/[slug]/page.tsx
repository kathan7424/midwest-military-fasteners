/**
 * File Name: page.tsx
 * Description: CMS pages + WooCommerce Shop page at its configured slug.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-07
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";

import CatalogListingPage from "@/components/pages/Product/CatalogListingPage";
import WpPageContent from "@/components/pages/WpPageContent/WpPageContent";
import { fetchMenu } from "@/services/menu.service";
import { fetchPageBySlug } from "@/services/page.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import { fetchYoastBySlug } from "@/services/seo.service";
import { MenuItem } from "@/types/menu.types";
import { is_catalog_listing_slug } from "@/utils/catalog-path.utils";
import { findMenuItemBySlug } from "@/utils/menu.utils";
import { buildYoastMetadata } from "@/utils/seo.utils";
import { decodeHtmlEntities } from "@/utils/text.utils";

type Props = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    search?: string;
    series?: string;
    page?: string;
  }>;
};

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const normalized_slug = slug.toLowerCase();
  const listing_params = await searchParams;

  // All three fetches are independent — run in parallel to eliminate the
  // settings→content waterfall. For catalog slugs, menu/page resolve unused.
  const [settings_result, menu_result, page_result] = await Promise.allSettled([
    fetchSiteSettings(),
    fetchMenu(),
    fetchPageBySlug(normalized_slug),
  ]);

  const settings = settings_result.status === "fulfilled" ? settings_result.value : null;

  if (is_catalog_listing_slug(normalized_slug, settings?.woocommerce)) {
    return <CatalogListingPage searchParams={listing_params} />;
  }

  const menu: MenuItem[] =
    menu_result.status === "fulfilled" ? menu_result.value : [];

  if (menu_result.status === "rejected") {
    console.error("Menu fetch failed:", menu_result.reason);
  }

  const menu_item = findMenuItemBySlug(menu, normalized_slug);
  const wp_page = page_result.status === "fulfilled" ? page_result.value : null;

  if (page_result.status === "rejected") {
    console.error("Page fetch failed:", page_result.reason);
  }

  if (!menu_item && !wp_page) {
    notFound();
  }

  // WP returns titles HTML-encoded ("Shipping &#038; Returns") — decode for
  // the JSX text node (React never interprets runtime entity strings).
  const page_title = decodeHtmlEntities(
    wp_page?.title.rendered ?? menu_item?.title ?? ""
  );
  const page_content = wp_page?.content.rendered;

  if (!page_title && !page_content) {
    notFound();
  }

  return (
    <WpPageContent
      title={page_title || undefined}
      content={page_content}
    />
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const settings = await fetchSiteSettings();
    if (is_catalog_listing_slug(slug.toLowerCase(), settings?.woocommerce)) {
      return {
        title: "Product Catalog | Midwest Military Fasteners",
        description: "Browse Midwest Military Fasteners product catalog.",
      };
    }
  } catch {
    // Fall through to Yoast lookup.
  }

  try {
    const yoast = await fetchYoastBySlug(slug.toLowerCase());
    return buildYoastMetadata(yoast);
  } catch {
    return buildYoastMetadata();
  }
}
