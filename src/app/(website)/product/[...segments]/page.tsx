/**
 * File Name: page.tsx
 * Description: Product detail routes:
 *              /product/{wc-slug}           — WooCommerce post slug
 *              /product/{series}/{sku}      — legacy redirect to slug URL
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { notFound, permanentRedirect } from "next/navigation";

import { ProductDetailPage } from "@/components/pages/ProductDetail";
import {
  fetch_sidebar_categories,
  fetch_spec_parts_product_by_slug,
  fetch_spec_parts_product_by_sku,
} from "@/services/spec-parts.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import { build_product_path } from "@/utils/catalog-url.utils";
import { get_catalog_listing_path } from "@/utils/catalog-path.utils";
import { map_spec_parts_product_to_table_product } from "@/utils/spec-parts.utils";

type Props = {
  params: Promise<{
    segments: string[];
  }>;
};

async function load_product_by_slug(slug: string) {
  const decoded_slug = decodeURIComponent(slug);

  try {
    return await fetch_spec_parts_product_by_slug(decoded_slug);
  } catch {
    try {
      return await fetch_spec_parts_product_by_sku(decoded_slug);
    } catch {
      return null;
    }
  }
}

async function render_product_detail(slug: string) {
  // Sidebar and settings don't depend on the product — fetch all three at once.
  const [raw_product, sidebar_categories, settings] = await Promise.all([
    load_product_by_slug(slug),
    fetch_sidebar_categories(),
    fetchSiteSettings().catch(() => null),
  ]);

  if (!raw_product) {
    notFound();
  }

  const product = map_spec_parts_product_to_table_product(raw_product);
  const catalog_listing_path = get_catalog_listing_path(settings?.woocommerce);

  return (
    <ProductDetailPage
      series={product.seriesSlug}
      product={product}
      sidebarCategories={sidebar_categories}
      catalogListingPath={catalog_listing_path}
    />
  );
}

export default async function Page({ params }: Props) {
  const { segments } = await params;

  if (!segments?.length) {
    notFound();
  }

  if (segments.length === 1) {
    return render_product_detail(segments[0]);
  }

  if (segments.length === 2) {
    const part_number = decodeURIComponent(segments[1]);

    try {
      const raw_product = await fetch_spec_parts_product_by_sku(part_number);
      const product = map_spec_parts_product_to_table_product(raw_product);

      if (product.slug) {
        permanentRedirect(build_product_path(product.slug));
      }
    } catch {
      // Fall through to notFound.
    }

    notFound();
  }

  notFound();
}
