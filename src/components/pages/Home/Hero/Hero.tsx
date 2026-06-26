/**
 * File Name: Hero.tsx
 * Description: Home page hero — dynamic banner from API with search and categories.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

import Image from "next/image";

import CategoryGrid from "@/components/pages/Home/Hero/CategoryGrid";
import SearchBar from "@/components/pages/Home/Hero/SearchBar";
import {
  HERO_FALLBACK_IMAGE,
  HERO_TITLE,
} from "@/data/hero.data";
import { HomePageBanner } from "@/types/home-page.types";

interface HeroProps {
  banner: HomePageBanner;
}

export default function Hero({ banner }: HeroProps) {
  const { banner_title, banner_image } = banner;
  const title = banner_title || HERO_TITLE;
  const imageSrc = banner_image?.url || HERO_FALLBACK_IMAGE;
  const imageAlt =
    banner_image?.alt || banner_title || "Midwest Military Fasteners";

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="absolute inset-0 bg-amber/85" />

      <div className="relative z-10">
        <div className="mx-auto flex min-h-[760px] max-w-8xl flex-col items-center px-5 pt-32 pb-20">
          <h1 className="mb-14 max-w-[1120px] text-center text-[30px] font-black leading-[1.1] text-white sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[60px]">
            {title}
          </h1>

          <SearchBar />

          <CategoryGrid />
        </div>
      </div>
    </section>
  );
}
