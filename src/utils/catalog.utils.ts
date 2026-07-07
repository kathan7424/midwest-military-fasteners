/**
 * File Name: catalog.utils.ts
 * Description: Product catalog API to home hero grid transformers.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import {
  CatalogParentCategory,
  CategorySectionData,
} from "@/types/product-catalog.types";
import { normalizeWpUrl } from "@/utils/url.utils";

/**
 * Map WordPress catalog rows to the home hero category grid shape.
 * Sections and columns without products are omitted.
 */
export function mapCatalogToCategorySections(
  catalog: CatalogParentCategory[]
): CategorySectionData[] {
  return catalog
    .map((row) => ({
      title: row.parent_category.name,
      columns: row.child_categories
        .map((child) => ({
          title: child.category.name,
          items: child.products.map((product) => ({
            label: product.sku || product.name,
            href: normalizeWpUrl(product.permalink),
          })),
        }))
        .filter((column) => column.items.length > 0),
    }))
    .filter((section) => section.columns.length > 0);
}
