/**
 * File Name: CatalogListingPage.tsx
 * Description: Shared product catalog listing (WooCommerce Shop page).
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { ProductPage } from "@/components/pages/Product";
import {
  fetch_sidebar_categories,
  fetch_spec_parts_products,
} from "@/services/spec-parts.service";
import { map_spec_parts_product_to_table_product } from "@/utils/spec-parts.utils";
import { resolve_product_image_url } from "@/utils/product-image.utils";

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

  const [sidebar_categories, products_response] = await Promise.all([
    fetch_sidebar_categories(),
    fetch_spec_parts_products({
      search: searchParams.search,
      series: searchParams.series,
      per_page: 10,
      page: current_page,
    }),
  ]);

  return (
    <ProductPage
      title="Product Catalog"
      imageSrc={resolve_product_image_url(
        products_response.products[0]?.image
      )}
      products={products_response.products.map(map_spec_parts_product_to_table_product)}
      sidebarCategories={sidebar_categories}
      breadcrumb={[{ label: "PRODUCT CATALOG" }]}
      activeSeriesId={searchParams.series}
      initialSearch={searchParams.search ?? ""}
      currentPage={products_response.page}
      totalPages={products_response.pages}
    />
  );
}
