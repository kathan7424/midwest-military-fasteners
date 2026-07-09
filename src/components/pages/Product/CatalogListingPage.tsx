/**
 * File Name: CatalogListingPage.tsx
 * Description: Shared product catalog listing (WooCommerce Shop page).
 *              Hero title / description / image come from the WP Shop page
 *              (editable in WP admin), with static fallbacks.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { ProductPage } from "@/components/pages/Product";
import {
  fetch_sidebar_categories,
  fetch_spec_parts_products,
} from "@/services/spec-parts.service";
import { fetchPageBySlug, get_page_featured_image } from "@/services/page.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import { map_spec_parts_product_to_table_product } from "@/utils/spec-parts.utils";
import { resolve_product_image_url } from "@/utils/product-image.utils";
import { decodeHtmlEntities } from "@/utils/text.utils";

export interface CatalogListingSearchParams {
  search?: string;
  series?: string;
  page?: string;
}

interface CatalogListingPageProps {
  searchParams?: CatalogListingSearchParams;
}

export default async function CatalogListingPage({
  searchParams = {},
}: CatalogListingPageProps) {
  const current_page = Math.max(1, Number(searchParams.page) || 1);

  const [sidebar_categories, products_response, settings] = await Promise.all([
    fetch_sidebar_categories(),
    fetch_spec_parts_products({
      search: searchParams.search,
      series: searchParams.series,
      per_page: 10,
      page: current_page,
    }),
    fetchSiteSettings().catch(() => null),
  ]);

  // WC Shop page content drives the hero (title/description/image are
  // edited in WP admin — the frontend never hardcodes them).
  const shop_page_slug = settings?.woocommerce?.shop_page_slug || "shop";
  const shop_page = await fetchPageBySlug(shop_page_slug).catch(() => null);

  const hero_title = shop_page?.title?.rendered
    ? decodeHtmlEntities(shop_page.title.rendered)
    : "Product Catalog";
  const hero_image =
    get_page_featured_image(shop_page) ||
    resolve_product_image_url(products_response.products[0]?.image);

  return (
    <ProductPage
      title={hero_title}
      description={shop_page?.content?.rendered}
      imageSrc={hero_image}
      products={products_response.products.map(map_spec_parts_product_to_table_product)}
      sidebarCategories={sidebar_categories}
      breadcrumb={[{ label: hero_title.toUpperCase() }]}
      activeSeriesId={searchParams.series}
      initialSearch={searchParams.search ?? ""}
      currentPage={products_response.page}
      totalPages={products_response.pages}
    />
  );
}
