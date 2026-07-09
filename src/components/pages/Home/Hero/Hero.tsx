/**
 * File Name: Hero.tsx
 * Description: Home page hero — dynamic banner from API with search and categories.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-06
 */

import Image from "next/image";

import CategoryGrid from "@/components/pages/Home/Hero/CategoryGrid";
import SearchBar from "@/components/pages/Home/Hero/SearchBar";
import { CategorySectionData } from "@/types/product-catalog.types";
import { HomePageBanner } from "@/types/home-page.types";
import { hasText } from "@/utils/content.utils";

interface HeroProps {
  banner: HomePageBanner;
  categories: CategorySectionData[];
}

export default function Hero({ banner, categories }: HeroProps) {
  const { banner_title, banner_image } = banner;
  const hasBannerImage = Boolean(banner_image?.url);
  const hasBannerTitle = hasText(banner_title);
  const hasCategories = categories.length > 0;
  const imageAlt =
    banner_image?.alt || banner_title || "Midwest Military Fasteners";

  return (
    <section className={`relative overflow-hidden ${hasBannerImage ? "" : "bg-amber"}`}>
      {hasBannerImage ? (
        <div className="pointer-events-none absolute inset-0">
          <Image
            src={banner_image!.url}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 bg-amber/85" />

      <div className="relative z-10">
        <div className="mx-auto flex min-h-[760px] max-w-8xl flex-col items-center px-5 pt-32 pb-20">
          {hasBannerTitle ? (
            <h1 className="mb-14 max-w-[1120px] text-center text-[30px] font-black leading-[1.1] text-white sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[60px]">
              {banner_title}
            </h1>
          ) : null}

          <SearchBar />

          {hasCategories ? <CategoryGrid categories={categories} /> : null}
        </div>
      </div>
    </section>
  );
}
