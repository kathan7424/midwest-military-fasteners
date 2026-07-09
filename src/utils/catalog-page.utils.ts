/**
 * File Name: catalog-page.utils.ts
 * Description: Helpers for category/archive catalog pages.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { BreadcrumbItem } from "@/components/shared_Ui/Breadcrumb";
import type { SidebarCategory } from "@/components/layout/Sidebar/types";
import type { SpecPartsCategoryTerm } from "@/types/spec-parts.types";
import { decodeHtmlEntities } from "@/utils/text.utils";
import { resolve_category_hero_image } from "@/utils/product-image.utils";

export function flatten_spec_parts_categories(
  categories: SpecPartsCategoryTerm[]
): SpecPartsCategoryTerm[] {
  return categories.flatMap((category) => [category, ...flatten_spec_parts_categories(category.children)]);
}

export function find_spec_parts_category(
  categories: SpecPartsCategoryTerm[],
  slug?: string
): SpecPartsCategoryTerm | null {
  if (!slug) {
    return null;
  }

  return flatten_spec_parts_categories(categories).find((category) => category.slug === slug) ?? null;
}

export function find_parent_category_slug(
  sidebar_categories: SidebarCategory[],
  child_slug?: string
): string | undefined {
  if (!child_slug) {
    return undefined;
  }

  return sidebar_categories.find((parent) =>
    parent.groups.some((group) => group.id === child_slug)
  )?.id;
}

export function find_spec_parts_series(
  categories: SpecPartsCategoryTerm[],
  category_slug?: string,
  series_slug?: string
) {
  if (!category_slug || !series_slug) {
    return null;
  }

  const category = find_spec_parts_category(categories, category_slug);
  return category?.series?.find((series) => series.slug === series_slug) ?? null;
}

export interface CatalogHeroContext {
  title: string;
  description?: string;
  imageSrc?: string;
  partSeriesLabel?: string;
}

export function build_catalog_hero_context(
  categories: SpecPartsCategoryTerm[],
  category_slug?: string,
  series_slug?: string,
  fallback_image?: string,
  direct_category?: SpecPartsCategoryTerm | null
): CatalogHeroContext {
  if (!category_slug) {
    return { title: "Product Catalog" };
  }

  const category =
    direct_category ?? find_spec_parts_category(categories, category_slug);

  if (!category) {
    return { title: "Product Catalog" };
  }

  const series = find_spec_parts_series(categories, category_slug, series_slug);
  const raw_description = category.description?.trim();

  return {
    title: decodeHtmlEntities(category.name),
    description: raw_description
      ? decodeHtmlEntities(raw_description)
      : undefined,
    imageSrc: resolve_category_hero_image(category.image, fallback_image),
    partSeriesLabel: series?.name ? decodeHtmlEntities(series.name) : undefined,
  };
}

export function build_catalog_breadcrumb(
  sidebar_categories: SidebarCategory[],
  active_category_slug?: string,
  active_series_label?: string
): BreadcrumbItem[] {
  if (!active_category_slug) {
    return [{ label: "PRODUCT CATALOG" }];
  }

  const items: BreadcrumbItem[] = [];

  sidebar_categories.forEach((parent) => {
    const matching_group = parent.groups.find((group) => group.id === active_category_slug);

    if (!matching_group) {
      return;
    }

    items.push({ label: parent.label });
    items.push({
      label: matching_group.label.toUpperCase(),
      href: matching_group.href,
    });
  });

  if (active_series_label) {
    items.push({ label: active_series_label.toUpperCase() });
  }

  return items;
}

