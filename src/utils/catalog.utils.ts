/**
 * File Name: catalog.utils.ts
 * Description: Product catalog API to home hero grid transformers.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { CATEGORY_DATA } from "@/data/categories.data";
import {
  CatalogParentCategory,
  CategorySectionData,
} from "@/types/product-catalog.types";
import { normalizeWpUrl } from "@/utils/url.utils";

/**
 * Map WordPress catalog rows to the home hero category grid shape.
 */
export function mapCatalogToCategorySections(
  catalog: CatalogParentCategory[]
): CategorySectionData[] {
  return catalog
    .map((row) => ({
      title: row.parent_category.name,
      columns: row.child_categories.map((child) => ({
        title: child.category.name,
        items: child.products.map((product) => ({
          label: product.sku || product.name,
          href: normalizeWpUrl(product.permalink),
        })),
      })),
    }))
    .filter((section) => section.columns.length > 0);
}

/**
 * Use API catalog when available; otherwise fall back to static data.
 */
export function resolveCategorySections(
  catalog: CatalogParentCategory[]
): CategorySectionData[] {
  const mapped = mapCatalogToCategorySections(catalog);

  if (mapped.length > 0) {
    return mapped;
  }

  return CATEGORY_DATA.map((section) => ({
    title: section.title,
    columns: section.columns.map((column) => ({
      title: column.title,
      items: column.items.map((item) => ({
        label: item,
        href: "#",
      })),
    })),
  }));
}
