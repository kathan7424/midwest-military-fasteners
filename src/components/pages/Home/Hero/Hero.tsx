import Image from "next/image";

import SearchBar from "./SearchBar";
import { HERO_TITLE } from "./heroData";

import CategoryGrid from "./CategoryGrid";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-bg-banner.webp" // Replace with your exported Figma image
          alt="Midwest Military Fasteners"
          fill
          priority
          className="object-cover object-center"
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-amber/85" />

      {/* Content */}
      <div className="relative z-10">
        <div className="mx-auto flex min-h-[760px] max-w-container-8xl flex-col items-center px-5 pt-32 pb-20">

          {/* Heading */}
          <h1 className=" mb-14 max-w-[1120px] text-center font-black text-white leading-[1.1] xl:text-[60px] lg:text-[52px] md:text-[44px] sm:text-[36px] text-[30px] " > {HERO_TITLE} </h1>

          {/* Search */}
          <SearchBar />

          {/* Category Grid*/}
          <CategoryGrid />

        </div>
      </div>
    </section>
  );
}