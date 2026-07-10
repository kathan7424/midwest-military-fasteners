/**
 * File Name: spec-parts.utils.ts
 * Description: Mappers for spec-parts catalog data into frontend UI shapes.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cache } from "react";

import type { SidebarCategory } from "@/components/layout/Sidebar/types";
import type { Product } from "@/components/pages/Product/ProductTable";
import type {
  SpecPartsCategoryTerm,
  SpecPartsPackagePricingTier,
  SpecPartsProduct,
  SpecPartsSeriesTerm,
} from "@/types/spec-parts.types";
import { format_store_price } from "@/utils/currency.utils";
import { decodeHtmlEntities } from "@/utils/text.utils";
import {
  build_product_category_path,
  build_product_category_series_path,
  extract_product_slug_from_permalink,
} from "@/utils/catalog-url.utils";
import { resolve_product_image_url } from "@/utils/product-image.utils";
import {
  get_cached_category_series_for_sidebar,
  get_cached_spec_parts_categories,
} from "@/services/catalog-data.service";

/**
 * Sidebar shows the WP category tree as-is: real parents, real children,
 * "uncategorized" excluded. Category structure is managed in WP Admin —
 * the frontend never invents or re-buckets categories.
 */
export function filter_spec_parts_categories_for_sidebar(
  categories: SpecPartsCategoryTerm[]
): SpecPartsCategoryTerm[] {
  return categories
    .filter((parent) => parent.slug !== "uncategorized")
    .map((parent) => ({
      ...parent,
      children: [...(parent.children ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    }));
}

export function has_product_spec_sheet(spec_file_url?: string | null): boolean {
  const value = spec_file_url?.trim();
  return Boolean(value && value !== "#");
}

export function has_product_document(file_url?: string | null): boolean {
  return has_product_spec_sheet(file_url);
}

export function map_product_spec_href(spec_file_url?: string | null): string {
  if (!has_product_spec_sheet(spec_file_url)) {
    return "";
  }

  // Cross-origin WP files can't force-download via the `download` attribute —
  // route through the same-origin proxy which sets Content-Disposition.
  return `/api/download?url=${encodeURIComponent(spec_file_url!.trim())}`;
}

export function map_product_certificate_href(certificate_file_url?: string | null): string {
  return map_product_spec_href(certificate_file_url);
}

function format_price(value: unknown): string {
  const numeric = Number(value);

  if (Number.isFinite(numeric) && numeric > 0) {
    return format_store_price(numeric);
  }

  return "";
}

function get_tier_price(
  tiers: SpecPartsPackagePricingTier[],
  package_quantity: number
): string {
  const match = tiers.find((tier) => {
    const raw_value = tier.package_quantity ?? tier.qty;
    return Number(raw_value) === package_quantity;
  });

  return match ? format_price(match.price) : "";
}

export function map_spec_parts_product_to_table_product(
  product: SpecPartsProduct
): Product {
  const primary_series = product.product_series[0];
  const primary_category =
    product.categories.find((category) => category.parent_id > 0) ??
    product.categories[0];

  const slug =
    product.slug?.trim() ||
    extract_product_slug_from_permalink(product.permalink);

  return {
    id: product.id,
    slug,
    partNumber: decodeHtmlEntities(product.sku || product.name),
    sku: decodeHtmlEntities(product.sku),
    description: decodeHtmlEntities(
      product.short_description || product.description || product.name
    ),
    longDescription: decodeHtmlEntities(
      product.description || product.short_description || product.name
    ),
    pkgQty: product.pkg_qty ?? 0,
    price1: get_tier_price(product.package_pricing, 1) || format_price(product.price),
    price3: get_tier_price(product.package_pricing, 3),
    price5: get_tier_price(product.package_pricing, 5),
    price10: get_tier_price(product.package_pricing, 10),
    mfr: decodeHtmlEntities(product.manufacturer || ""),
    country: decodeHtmlEntities(product.country || ""),
    specHref: map_product_spec_href(product.spec_file_url),
    certHref: map_product_certificate_href(product.certificate_file_url),
    seriesSlug: primary_series?.slug || "series",
    seriesLabel: primary_series?.name
      ? decodeHtmlEntities(primary_series.name)
      : undefined,
    categorySlug: primary_category?.slug,
    parentCategorySlug:
      primary_category?.parent_slug ||
      product.categories.find(
        (category) => category.id === primary_category?.parent_id
      )?.slug,
    categoryLabel: primary_category?.name
      ? decodeHtmlEntities(primary_category.name)
      : undefined,
    image: resolve_product_image_url(product.image),
    gallery: (product.gallery ?? [])
      .map((url) => resolve_product_image_url(url))
      .filter((url): url is string => Boolean(url)),
    stock_status: product.stock_status,
    stock_quantity: product.stock_quantity,
  };
}

export function map_spec_parts_categories_to_sidebar(
  categories: SpecPartsCategoryTerm[]
): SidebarCategory[] {
  return filter_spec_parts_categories_for_sidebar(categories)
    .map((parent) => ({
      id: parent.slug,
      label: decodeHtmlEntities(parent.name).toUpperCase(),
      groups: parent.children
        // WooCommerce-style hide_empty: only categories with actual products
        // (or assigned series) belong in the sidebar.
        .filter(
          (child) => (child.count ?? 0) > 0 || (child.series ?? []).length > 0
        )
        .map((child) => ({
          id: child.slug,
          label: decodeHtmlEntities(child.name),
          href: build_product_category_path(parent.slug, child.slug),
          // hide_empty: a series with zero published products is dead weight
          // in the nav — clicking it could only show an empty table.
          series: (child.series ?? [])
            .filter((series) => (series.count ?? 0) > 0)
            .map((series) => ({
            id: series.slug,
            label: decodeHtmlEntities(series.name).toUpperCase(),
            href: build_product_category_series_path(
              parent.slug,
              child.slug,
              series.slug
            ),
          })),
        })),
    }))
    .filter((parent) => parent.groups.length > 0);
}

/**
 * Build sidebar navigation with part-series from taxonomy=product-series.
 */
export async function build_sidebar_categories(
  categories: SpecPartsCategoryTerm[]
): Promise<SidebarCategory[]> {
  const normalized = filter_spec_parts_categories_for_sidebar(categories);
  const sidebar = map_spec_parts_categories_to_sidebar(normalized);

  // The categories API already returns series per child term. Only run the
  // expensive per-category taxonomy sweep for groups it left empty — this
  // turns dozens of WP round-trips per page load into zero on the happy path.
  const groups_needing_series = normalized.flatMap((parent) =>
    parent.children
      .filter((child) => (child.series ?? []).length === 0)
      .map((child) => child.slug)
  );

  const taxonomy_series_batches = await Promise.all(
    groups_needing_series.map((group_slug) =>
      get_cached_category_series_for_sidebar(group_slug)
    )
  );

  return sidebar.map((parent) => ({
    ...parent,
    groups: parent.groups.map((group) => {
      const group_index = groups_needing_series.indexOf(group.id);
      const taxonomy_series =
        group_index >= 0 ? taxonomy_series_batches[group_index] : [];

      const taxonomy_links = map_series_terms_to_sidebar_links(
        parent.id,
        group.id,
        taxonomy_series
      );

      const merged = new Map(
        group.series.map((series) => [series.id, series] as const)
      );

      taxonomy_links.forEach((series) => merged.set(series.id, series));

      return {
        ...group,
        series: Array.from(merged.values()).sort((a, b) =>
          a.label.localeCompare(b.label)
        ),
      };
    }),
  }));
}

/**
 * Single cached sidebar tree — shared by cart, shop, category, and product pages.
 */
export const get_cached_sidebar_categories = cache(
  async (): Promise<SidebarCategory[]> => {
    const categories = await get_cached_spec_parts_categories();
    return build_sidebar_categories(categories);
  }
);

export function warm_sidebar_categories_cache(): void {
  void get_cached_sidebar_categories().catch(() => undefined);
}

function map_series_terms_to_sidebar_links(
  parent_slug: string,
  group_id: string,
  terms: SpecPartsSeriesTerm[]
): Array<{ id: string; label: string; href: string }> {
  return terms.map((term) => ({
    id: term.slug,
    label: decodeHtmlEntities(term.name).toUpperCase(),
    href: build_product_category_series_path(parent_slug, group_id, term.slug),
  }));
}

