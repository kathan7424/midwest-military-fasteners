/**
 * File Name: search.utils.ts
 * Description: Shared label mapping for WordPress global search results —
 *   used by both the live suggestion dropdown (client) and the full search
 *   results page (server), so a term always shows the same type label
 *   wherever it appears.
 * Developer: KP-184
 * Created Date: 2026-07-21
 */

export const SEARCH_TYPE_LABELS: Record<string, string> = {
  product: "Product",
  page: "Page",
  post: "Post",
};

export const SEARCH_TAXONOMY_LABELS: Record<string, string> = {
  category: "Category",
  post_tag: "Tag",
  product_cat: "Category",
  product_tag: "Tag",
  // Live site uses "product-series"; legacy/import content used
  // "product_series" — same taxonomy, two possible slugs (see
  // specparts_get_series_taxonomy() in wordpress/functions.php).
  "product-series": "Series",
  product_series: "Series",
};

export function get_search_taxonomy_label(taxonomy: string): string {
  return SEARCH_TAXONOMY_LABELS[taxonomy] || "Term";
}
