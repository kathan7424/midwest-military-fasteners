/**
 * File Name: page.tsx
 * Description: Product catalog — alias for WooCommerce Shop page (/product).
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { permanentRedirect } from "next/navigation";

import CatalogListingPage from "@/components/pages/Product/CatalogListingPage";
import { fetchSiteSettings } from "@/services/site-settings.service";
import {
  build_catalog_listing_url,
  get_catalog_listing_path,
} from "@/utils/catalog-path.utils";

type Props = {
  searchParams: Promise<{
    search?: string;
    series?: string;
    page?: string;
  }>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  // Only the WC shop-page-slug setting is needed for the redirect check —
  // fetching the full shell bundle (menu + footer + auth, via
  // getWebsiteShellData) here would block CatalogListingPage's own
  // Promise.all from starting until all four resolved, even though it only
  // needs settings itself. React.cache() means this is the same in-flight
  // settings fetch the layout and CatalogListingPage already use — no extra
  // network call, just a narrower dependency before rendering the catalog.
  const settings = await fetchSiteSettings().catch(() => null);
  const catalog_path = get_catalog_listing_path(settings?.woocommerce);

  if (catalog_path !== "/product") {
    permanentRedirect(
      build_catalog_listing_url(catalog_path, {
        search: params.search,
        series: params.series,
        page: params.page,
      })
    );
  }

  return <CatalogListingPage searchParams={params} />;
}
