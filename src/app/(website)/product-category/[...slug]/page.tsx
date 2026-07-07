/**
 * File Name: page.tsx
 * Description: WooCommerce-style product category archive page.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { notFound } from "next/navigation";

import { ProductPage } from "@/components/pages/Product";
import {
  fetch_spec_parts_categories,
  fetch_spec_parts_products,
} from "@/services/spec-parts.service";
import {
  find_spec_parts_category,
  build_catalog_breadcrumb,
} from "@/utils/catalog-page.utils";
import {
  map_spec_parts_categories_to_sidebar,
  map_spec_parts_product_to_table_product,
} from "@/utils/spec-parts.utils";

type Props = {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    search?: string;
    series?: string;
    page?: string;
  }>;
};

export default async function ProductCategoryPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const active_category_slug = slug[slug.length - 1];
  const current_page = Math.max(1, Number(query.page) || 1);

  const categories = await fetch_spec_parts_categories();
  const active_category = find_spec_parts_category(categories, active_category_slug);

  if (!active_category) {
    notFound();
  }

  const [products_response] = await Promise.all([
    fetch_spec_parts_products({
      category: active_category_slug,
      search: query.search,
      series: query.series,
      per_page: 10,
      page: current_page,
    }),
  ]);

  const sidebar_categories = map_spec_parts_categories_to_sidebar(categories);

  const active_series = active_category.series?.find(
    (series) => series.slug === query.series
  );

  return (
    <ProductPage
      title={active_category.name}
      description={active_category.description || undefined}
      products={products_response.products.map(map_spec_parts_product_to_table_product)}
      sidebarCategories={sidebar_categories}
      breadcrumb={build_catalog_breadcrumb(
        sidebar_categories,
        active_category_slug,
        active_series?.name
      )}
      activeGroupId={active_category_slug}
      activeSeriesId={query.series}
      initialSearch={query.search ?? ""}
      partSeriesLabel={active_series?.name}
      currentPage={products_response.page}
      totalPages={products_response.pages}
    />
  );
}
