/**
 * File Name: page.tsx
 * Description: Product catalog — alias for WooCommerce Shop page (/product).
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { permanentRedirect } from "next/navigation";

import CatalogListingPage from "@/components/pages/Product/CatalogListingPage";
import { getWebsiteShellData } from "@/services/shell-data.service";
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
  const shell = await getWebsiteShellData();
  const catalog_path = get_catalog_listing_path(shell.settings?.woocommerce);

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
