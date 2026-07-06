/**
 * File Name: page.tsx
 * Description: Home page — hero banner, search, and category grid.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-06
 */

import type { Metadata } from "next";

import Hero from "@/components/pages/Home/Hero";
import { fetchHomePage } from "@/services/home-page.service";
import { fetchProductCatalog } from "@/services/product-catalog.service";
import { fetchYoastBySlug } from "@/services/seo.service";
import { HomePageBanner } from "@/types/home-page.types";
import { resolveCategorySections } from "@/utils/catalog.utils";
import { buildYoastMetadata } from "@/utils/seo.utils";

const HOME_SLUG = "home-page";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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
  let banner = EMPTY_BANNER;
  let categories = resolveCategorySections([]);

  try {
    const [homePage, catalogResponse] = await Promise.all([
      fetchHomePage(),
      fetchProductCatalog(),
    ]);

    banner = homePage.banner;
    categories = resolveCategorySections(catalogResponse.catalog);
  } catch (error) {
    console.error("Home page fetch failed:", error);
  }

  return <Hero banner={banner} categories={categories} />;
}
