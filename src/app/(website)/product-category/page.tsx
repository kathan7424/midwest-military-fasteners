/**
 * File Name: page.tsx
 * Description: Redirect bare /product-category to the catalog listing.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { redirect } from "next/navigation";

import { getWebsiteShellData } from "@/services/shell-data.service";
import { get_catalog_listing_path } from "@/utils/catalog-path.utils";

export default async function ProductCategoryIndexPage() {
  const shell = await getWebsiteShellData();
  redirect(get_catalog_listing_path(shell.settings?.woocommerce));
}
