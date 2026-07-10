/**
 * File Name: page.tsx
 * Description: Home page - hero banner, search, and category grid.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-10
 */

import type { Metadata } from "next";

import Hero from "@/components/pages/Home/Hero";
import IsoSection from "@/components/shared_Ui/IsoSection";
import { fetchHomePage } from "@/services/home-page.service";
import { fetchProductCatalog } from "@/services/product-catalog.service";
import { fetchYoastBySlug } from "@/services/seo.service";
import { HomePageBanner } from "@/types/home-page.types";
import { CategorySectionData } from "@/types/product-catalog.types";
import { mapCatalogToCategorySections } from "@/utils/catalog.utils";
import { buildYoastMetadata } from "@/utils/seo.utils";

const HOME_SLUG = "home-page";

// ISR: 60-second fallback; WP save_post hook revalidates "home-page" tag instantly.
export const revalidate = 60;

const EMPTY_BANNER: HomePageBanner = {
  banner_title: "",
  banner_image: null,
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const yoast = await fetchYoastBySlug(HOME_SLUG);
    return buildYoastMetadata(yoast);
  } catch {
    return buildYoastMetadata();
  }
}

export default async function HomePage() {
  // Both fetches run in parallel - page waits only for the slowest one.
  const [home_result, catalog_result] = await Promise.allSettled([
    fetchHomePage(),
    fetchProductCatalog(),
  ]);

  let banner = EMPTY_BANNER;
  let categories: CategorySectionData[] = [];

  if (home_result.status === "fulfilled") {
    banner = home_result.value.banner;
  } else {
    console.error("Home page fetch failed:", home_result.reason);
  }

  if (catalog_result.status === "fulfilled") {
    categories = mapCatalogToCategorySections(catalog_result.value.catalog ?? []);
  } else {
    console.error("Product catalog fetch failed:", catalog_result.reason);
  }

  return (
    <>
      <Hero banner={banner} categories={categories} />
      <div className="mx-auto max-w-[1680px] px-5">
        <IsoSection align="center" />
      </div>
    </>
  );
}
