/**
 * File Name: page.tsx
 * Description: Route for the product listing page (/product).
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { ProductPage } from "@/components/pages/Product";
import { fetch_spec_parts_categories, fetch_spec_parts_products } from "@/services/spec-parts.service";
import {
  attach_series_to_sidebar,
  map_spec_parts_categories_to_sidebar,
  map_spec_parts_product_to_table_product,
} from "@/utils/spec-parts.utils";

type Props = {
  searchParams: Promise<{
    search?: string;
    series?: string;
    page?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const current_page = Math.max(1, Number(params.page) || 1);
  const [categories, sidebar_products_response, products_response] = await Promise.all([
    fetch_spec_parts_categories(),
    fetch_spec_parts_products({
      series: params.series,
      per_page: 200,
    }),
    fetch_spec_parts_products({
      search: params.search,
      series: params.series,
      per_page: 10,
      page: current_page,
    }),
  ]);

  const sidebar_categories = attach_series_to_sidebar(
    map_spec_parts_categories_to_sidebar(categories),
    sidebar_products_response.products
  );

  return (
    <ProductPage
      title="Product Catalog"
      products={products_response.products.map(map_spec_parts_product_to_table_product)}
      sidebarCategories={sidebar_categories}
      breadcrumb={[{ label: "PRODUCT CATALOG" }]}
      activeSeriesId={params.series}
      initialSearch={params.search ?? ""}
      currentPage={products_response.page}
      totalPages={products_response.pages}
    />
  );
}
