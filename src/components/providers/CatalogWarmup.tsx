/**
 * File Name: CatalogWarmup.tsx
 * Description: Background prefetch of catalog APIs after hydration.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useEffect } from "react";

import { API_ROUTES } from "@/config/routes";

function prefetch_catalog_endpoint(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const init: RequestInit = {
    method: "GET",
    credentials: "same-origin",
  };

  if ("priority" in Request.prototype) {
    (init as RequestInit & { priority?: string }).priority = "low";
  }

  void fetch(url, init).catch(() => undefined);
}

/**
 * Warms category + first shop page in the background so catalog routes feel instant.
 */
export default function CatalogWarmup() {
  useEffect(() => {
    prefetch_catalog_endpoint(API_ROUTES.catalogCategories);
    prefetch_catalog_endpoint(
      `${API_ROUTES.catalogProducts}?per_page=10&page=1`
    );
  }, []);

  return null;
}
