import type { MetadataRoute } from "next";

import { ENV } from "@/config/env";
import { fetch_sidebar_categories } from "@/services/spec-parts.service";
import { fetch_spec_parts_products } from "@/services/spec-parts.service";
import { build_product_path } from "@/utils/catalog-url.utils";

export const revalidate = 3600;

const STATIC_ROUTES = ["", "/shop", "/about", "/quality", "/contact"];

// Safety cap so a runaway catalog can't produce an unbounded sitemap fetch —
// log-scale beyond this and a real sitemap INDEX (multiple files) is the
// next step, not a bigger single file.
const MAX_PRODUCTS = 5000;
const PAGE_SIZE = 200;

async function collect_all_product_paths(): Promise<string[]> {
  const paths: string[] = [];
  let page = 1;

  while (paths.length < MAX_PRODUCTS) {
    const response = await fetch_spec_parts_products({
      per_page: PAGE_SIZE,
      page,
    }).catch(() => null);

    if (!response || response.products.length === 0) {
      break;
    }

    for (const product of response.products) {
      if (product.slug) {
        paths.push(build_product_path(product.slug));
      }
    }

    if (page >= response.pages) {
      break;
    }

    page += 1;
  }

  return paths;
}

function collect_category_and_series_paths(
  categories: Awaited<ReturnType<typeof fetch_sidebar_categories>>
): string[] {
  const paths: string[] = [];

  for (const category of categories) {
    for (const group of category.groups) {
      if (group.href) {
        paths.push(group.href);
      }
      for (const series of group.series) {
        paths.push(series.href);
      }
    }
  }

  return paths;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = ENV.SITE_URL.replace(/\/+$/, "");

  const [product_paths, sidebar_categories] = await Promise.all([
    collect_all_product_paths(),
    fetch_sidebar_categories().catch(() => []),
  ]);

  const category_paths = collect_category_and_series_paths(sidebar_categories);

  // De-dupe: a series link and its parent group can coincide for
  // single-series groups.
  const all_paths = Array.from(
    new Set([...STATIC_ROUTES, ...category_paths, ...product_paths])
  );

  return all_paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path.startsWith("/product/") ? 0.7 : 0.8,
  }));
}
