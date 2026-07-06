/**
 * File Name: search.types.ts
 * Description: WordPress global search API types.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

export interface SearchProductMeta {
  price_html: string;
  sku: string;
  in_stock: boolean;
}

export interface SearchPostResult {
  id: number;
  type: string;
  title: string;
  url: string;
  excerpt: string;
  image: string;
  date: string;
  categories: string[];
  tags: string[];
  product?: SearchProductMeta;
}

export interface SearchTermResult {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  url: string;
}

export interface SearchApiResponse {
  query: string;
  posts: SearchPostResult[];
  terms: SearchTermResult[];
  total: {
    posts: number;
    terms: number;
  };
}
