/**
 * File Name: page.tsx
 * Description: Route for a single product detail page
 *              (/product/[series]/[partNumber], e.g. /product/MS35307/MS35307-303).
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/pages/ProductDetail";
import {
  fetch_spec_parts_categories,
  fetch_spec_parts_products,
  fetch_spec_parts_product_by_sku,
} from "@/services/spec-parts.service";
import {
  attach_series_to_sidebar,
  map_spec_parts_categories_to_sidebar,
  map_spec_parts_product_to_table_product,
} from "@/utils/spec-parts.utils";

type Props = {
  params: Promise<{
    series: string;
    partNumber: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { series, partNumber } = await params;
  try {
    const [category_tree, raw_product] = await Promise.all([
      fetch_spec_parts_categories(),
      fetch_spec_parts_product_by_sku(partNumber),
    ]);
    const product = map_spec_parts_product_to_table_product(raw_product);
    const related_products_response = await fetch_spec_parts_products({
      category: product.categorySlug,
      per_page: 200,
    });
    const sidebar_categories = attach_series_to_sidebar(
      map_spec_parts_categories_to_sidebar(category_tree),
      related_products_response.products,
      product.categorySlug
    );

    return (
      <ProductDetailPage
        series={series}
        product={product}
        sidebarCategories={sidebar_categories}
      />
    );
  } catch {
    notFound();
  }
}
