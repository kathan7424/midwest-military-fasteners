/**
 * File Name: page.tsx
 * Description: WP product-series taxonomy permalink handler.
 *   WordPress generates /product-series/{slug}/ term links; the storefront's
 *   canonical URL for a series is /product-category/{parent}/{child}?series=.
 *   Redirect when the series is found in the sidebar tree; otherwise render
 *   the filtered catalog directly so the link never dead-ends in a 404.
 * Developer: KP-184
 * Created Date: 2026-07-16
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProductPage } from "@/components/pages/Product";
import {
  fetch_sidebar_categories,
  fetch_spec_parts_products,
} from "@/services/spec-parts.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import { map_spec_parts_product_to_table_product } from "@/utils/spec-parts.utils";
import { isUserLoggedIn } from "@/services/auth.service";

export const revalidate = 300;
export const dynamicParams = true;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
};

type MetadataProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { slug } = await params;
  const series_slug = decodeURIComponent(slug.trim());

  const [products_response, settings] = await Promise.all([
    fetch_spec_parts_products({ series: series_slug, per_page: 1, page: 1 }).catch(
      () => null
    ),
    fetchSiteSettings().catch(() => null),
  ]);

  const series_label =
    products_response?.products[0]?.product_series.find(
      (series) => series.slug === series_slug
    )?.name ?? series_slug.toUpperCase();

  const site_name = settings?.branding.site_title || "Midwest Military Fasteners";
  const title = `${series_label} | ${site_name}`;
  const description = `Shop the ${series_label} series at ${site_name} — genuine, certified fasteners.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(settings?.seoAnalytics?.default_og_image && {
        images: [{ url: settings.seoAnalytics.default_og_image }],
      }),
    },
  };
}

export default async function ProductSeriesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const series_slug = decodeURIComponent(slug.trim());
  const current_page = Math.max(1, Number(query.page) || 1);

  const [sidebar_categories, products_response, logged_in] = await Promise.all([
    fetch_sidebar_categories(),
    fetch_spec_parts_products({
      series: series_slug,
      search: query.search,
      per_page: 10,
      page: current_page,
    }),
    isUserLoggedIn(),
  ]);

  // Canonical URL: the category page with ?series= — same table, same
  // sidebar state, one URL shape for the whole catalog (WC-standard archive).
  for (const parent of sidebar_categories) {
    for (const group of parent.groups) {
      const match = group.series.find((series) => series.id === series_slug);
      if (match) {
        redirect(match.href);
      }
    }
  }

  // Series exists in WP but isn't attached to a sidebar category — render the
  // filtered catalog in place rather than 404ing a valid WP permalink.
  if (products_response.products.length === 0) {
    notFound();
  }

  const series_label =
    products_response.products[0]?.product_series.find(
      (series) => series.slug === series_slug
    )?.name ?? series_slug.toUpperCase();

  return (
    <ProductPage
      title={series_label}
      products={products_response.products.map(map_spec_parts_product_to_table_product)}
      sidebarCategories={sidebar_categories}
      breadcrumb={[{ label: "PRODUCT CATALOG", href: "/product" }, { label: series_label.toUpperCase() }]}
      activeSeriesId={series_slug}
      initialSearch={query.search ?? ""}
      partSeriesLabel={series_label}
      currentPage={products_response.page}
      totalPages={products_response.pages}
      showTierPricing={logged_in}
    />
  );
}
