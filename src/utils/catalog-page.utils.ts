/**
 * File Name: catalog-page.utils.ts
 * Description: Helpers for category/archive catalog pages.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { BreadcrumbItem } from "@/components/shared_Ui/Breadcrumb";
import type { SidebarCategory } from "@/components/layout/Sidebar/types";
import type { SpecPartsCategoryTerm } from "@/types/spec-parts.types";

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

export function build_catalog_breadcrumb(
  sidebar_categories: SidebarCategory[],
  active_category_slug?: string,
  active_series_label?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "PRODUCT CATALOG", href: "/product" }];

  if (!active_category_slug) {
    return items;
  }

  sidebar_categories.forEach((parent) => {
    const matching_group = parent.groups.find((group) => group.id === active_category_slug);

    if (!matching_group) {
      return;
    }

    items.push({ label: parent.label });
    items.push({
      label: matching_group.label.toUpperCase(),
      href: `/product-category/${matching_group.id}`,
    });
  });

  if (active_series_label) {
    items.push({ label: active_series_label.toUpperCase() });
  }

  return items;
}

