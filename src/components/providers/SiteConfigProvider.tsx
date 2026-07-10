/**
 * File Name: SiteConfigProvider.tsx
 * Description: Site-wide paths and shared settings from WordPress / WooCommerce.
 * Developer: KP-184
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-10
 */

"use client";

import { createContext, useContext } from "react";

import type { MediaItem } from "@/types/site-settings.types";
import { DEFAULT_CATALOG_LISTING_PATH } from "@/utils/catalog-path.utils";

export interface IsoSectionConfig {
  logo: MediaItem | null;
  iso_title: string | null;
  contentHtml: string;
}

interface SiteConfigContextValue {
  catalogListingPath: string;
  isoSection: IsoSectionConfig | null;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  catalogListingPath: DEFAULT_CATALOG_LISTING_PATH,
  isoSection: null,
});

interface SiteConfigProviderProps {
  catalogListingPath: string;
  isoSection?: IsoSectionConfig | null;
  children: React.ReactNode;
}

export function SiteConfigProvider({
  catalogListingPath,
  isoSection = null,
  children,
}: SiteConfigProviderProps) {
  return (
    <SiteConfigContext.Provider value={{ catalogListingPath, isoSection }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfigContextValue {
  return useContext(SiteConfigContext);
}
