/**
 * File Name: product-catalog.service.ts
 * Description: WordPress home page product catalog API service.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-08
 */

import { fetchWpJson } from "@/services/wp-api.service";
import { ProductCatalogResponse } from "@/types/product-catalog.types";

export async function fetchProductCatalog(): Promise<ProductCatalogResponse> {
  return fetchWpJson<ProductCatalogResponse>("/custom/v1/product-catalog", {
    mode: "static",
    revalidate: 60,
    tags: ["home-page"],
  });
}
