/**
 * File Name: product-catalog.types.ts
 * Description: Home page product catalog API types.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

export interface CatalogTerm {
  id: number;
  name: string;
  slug: string;
}

export interface CatalogProduct {
  id: number;
  sku: string;
  name: string;
  permalink: string;
}

export interface CatalogChildCategory {
  category: CatalogTerm;
  products: CatalogProduct[];
}

export interface CatalogParentCategory {
  parent_category: CatalogTerm;
  child_categories: CatalogChildCategory[];
}

export interface ProductCatalogResponse {
  catalog: CatalogParentCategory[];
}

export interface CategoryColumnItem {
  label: string;
  href: string;
}

export interface CategoryColumnData {
  title: string;
  items: CategoryColumnItem[];
}

export interface CategorySectionData {
  title: string;
  columns: CategoryColumnData[];
}
