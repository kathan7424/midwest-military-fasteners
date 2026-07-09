/**
 * File Name: spec-parts.types.ts
 * Description: Types for the WooCommerce spec-parts catalog API.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

export interface SpecPartsCategoryTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent_id?: number;
  description?: string;
  image?: string;
  children: SpecPartsCategoryTerm[];
  series?: SpecPartsSeriesTerm[];
}

export interface SpecPartsSeriesTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface SpecPartsProductCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number;
  parent_slug?: string;
}

export interface SpecPartsProductSeries {
  id: number;
  name: string;
  slug: string;
}

export interface SpecPartsPackagePricingTier {
  package_quantity?: number | string;
  qty?: number | string;
  price?: number | string;
  [key: string]: unknown;
}

export interface SpecPartsProduct {
  id: number;
  slug: string;
  sku: string;
  name: string;
  description: string;
  short_description: string;
  permalink: string;
  price: number;
  regular_price: number;
  stock_quantity: number;
  stock_status: string;
  weight: string;
  categories: SpecPartsProductCategory[];
  image: string;
  gallery: string[];
  manufacturer: string;
  country: string;
  dfar: boolean;
  product_series: SpecPartsProductSeries[];
  package_pricing: SpecPartsPackagePricingTier[];
  pkg_qty: number | null;
  spec_file_url: string;
  spec_files?: Array<{ name: string; url: string }>;
  certificate_file_url: string;
  mfr_coc: boolean;
  material_certs: boolean;
  process_certs: boolean;
  test_reports: boolean;
  backorder_leadtime: string;
  piece_weight: number;
}

export interface SpecPartsProductsResponse {
  total: number;
  pages: number;
  page: number;
  per_page: number;
  products: SpecPartsProduct[];
}

export interface SpecPartsProductsQueryParams {
  search?: string;
  sku?: string;
  slug?: string;
  category?: string;
  series?: string;
  manufacturer?: string;
  country?: string;
  dfar?: boolean;
  per_page?: number;
  page?: number;
}

