/**
 * File Name: spec-parts.utils.ts
 * Description: Mappers for spec-parts catalog data into frontend UI shapes.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { SidebarCategory } from "@/components/layout/Sidebar/types";
import type { Product } from "@/components/pages/Product/ProductTable";
import type {
  SpecPartsCategoryTerm,
  SpecPartsPackagePricingTier,
  SpecPartsProduct,
} from "@/types/spec-parts.types";

function format_price(value: unknown): string {
  const numeric = Number(value);

  if (Number.isFinite(numeric) && numeric > 0) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numeric);
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

  return {
    id: product.id,
    partNumber: product.sku || product.name,
    sku: product.sku,
    description: product.short_description || product.description || product.name,
    pkgQty: product.pkg_qty ?? 0,
    price1: get_tier_price(product.package_pricing, 1) || format_price(product.price),
    price3: get_tier_price(product.package_pricing, 3),
    price5: get_tier_price(product.package_pricing, 5),
    price10: get_tier_price(product.package_pricing, 10),
    mfr: product.manufacturer,
    country: product.country,
    specHref: product.spec_file_url || "#",
    seriesSlug: primary_series?.slug || "series",
    seriesLabel: primary_series?.name,
    categorySlug: primary_category?.slug,
    categoryLabel: primary_category?.name,
    image: product.image,
  };
}

export function map_spec_parts_categories_to_sidebar(
  categories: SpecPartsCategoryTerm[]
): SidebarCategory[] {
  return categories.map((parent) => ({
    id: parent.slug,
    label: parent.name.toUpperCase(),
    groups: parent.children.map((child) => ({
      id: child.slug,
      label: child.name,
      href: `/product-category/${child.slug}`,
      series: [],
    })),
  }));
}

export function attach_series_to_sidebar(
  sidebar_categories: SidebarCategory[],
  products: SpecPartsProduct[],
  active_category_slug?: string
): SidebarCategory[] {
  const series_by_category = new Map<string, Map<string, { id: string; label: string; href: string }>>();

  products.forEach((product) => {
    product.categories.forEach((category) => {
      if (active_category_slug && category.slug !== active_category_slug) {
        return;
      }

      if (!series_by_category.has(category.slug)) {
        series_by_category.set(category.slug, new Map());
      }

      const category_series = series_by_category.get(category.slug);

      product.product_series.forEach((series) => {
        category_series?.set(series.slug, {
          id: series.slug,
          label: series.name.toUpperCase(),
          href: `/product-category/${category.slug}?series=${encodeURIComponent(series.slug)}`,
        });
      });
    });
  });

  return sidebar_categories.map((parent) => ({
    ...parent,
    groups: parent.groups.map((group) => ({
      ...group,
      series: Array.from(series_by_category.get(group.id)?.values() ?? []),
    })),
  }));
}

