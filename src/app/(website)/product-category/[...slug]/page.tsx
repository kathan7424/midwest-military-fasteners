/**
 * File Name: page.tsx
 * Description: WooCommerce-style product category archive page.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { notFound } from "next/navigation";

import { ProductPage } from "@/components/pages/Product";
import {
  fetch_sidebar_categories,
  fetch_spec_parts_categories,
  fetch_spec_parts_category_by_slug,
  fetch_spec_parts_products,
} from "@/services/spec-parts.service";
import {
  find_spec_parts_category,
  build_catalog_breadcrumb,
  build_catalog_hero_context,
} from "@/utils/catalog-page.utils";
import { map_spec_parts_product_to_table_product } from "@/utils/spec-parts.utils";
import { isUserLoggedIn } from "@/services/auth.service";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const categories = await fetch_spec_parts_categories();
    const paths: { slug: string[] }[] = [];

    for (const parent of categories) {
      paths.push({ slug: [parent.slug] });
      for (const child of parent.children ?? []) {
        paths.push({ slug: [parent.slug, child.slug] });
      }
    }

    return paths;
  } catch {
    return [];
  }
}

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

  const [
    categories,
    direct_category,
    products_response,
    sidebar_categories,
    logged_in,
  ] = await Promise.all([
    fetch_spec_parts_categories(),
    fetch_spec_parts_category_by_slug(active_category_slug).catch(() => null),
    fetch_spec_parts_products({
      category: active_category_slug,
      search: query.search,
      series: query.series,
      per_page: 10,
      page: current_page,
    }),
    fetch_sidebar_categories(),
    isUserLoggedIn(),
  ]);

  const active_category =
    direct_category ?? find_spec_parts_category(categories, active_category_slug);

  // Only show 404 when the category definitely doesn't exist in WP: no
  // category metadata AND no products for this slug. When only the category
  // endpoint fails (timeout, duplicate-slug normalisation, dev-mode flake),
  // we still have products to show — render with a fallback title instead.
  if (!active_category && products_response.products.length === 0) {
    notFound();
  }

  const product_fallback_image = products_response.products[0]?.image;
  const hero = build_catalog_hero_context(
    categories,
    active_category_slug,
    query.series,
    product_fallback_image,
    direct_category
  );

  return (
    <ProductPage
      title={hero.title}
      description={hero.description}
      imageSrc={hero.imageSrc}
      products={products_response.products.map(map_spec_parts_product_to_table_product)}
      sidebarCategories={sidebar_categories}
      breadcrumb={build_catalog_breadcrumb(
        sidebar_categories,
        active_category_slug,
        hero.partSeriesLabel
      )}
      activeGroupId={active_category_slug}
      activeSeriesId={query.series}
      initialSearch={query.search ?? ""}
      partSeriesLabel={hero.partSeriesLabel}
      currentPage={products_response.page}
      totalPages={products_response.pages}
      showTierPricing={logged_in}
    />
  );
}
