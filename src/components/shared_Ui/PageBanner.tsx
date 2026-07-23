/**
 * File Name: PageBanner.tsx
 * Description: Shared full-width hero banner (dark overlay image + centered
 *   heading/sub-heading) — the "Banner Area" ACF field group's rendering,
 *   reused across every page that field group is attached to (About,
 *   Quality, Privacy Policy, Terms & Conditions, and any page added to its
 *   Location Rules later). Heading always has a value — the API resolves
 *   the page-title fallback server-side, this component just renders it.
 * Developer: KP-184
 * Created Date: 2026-07-21
 */

import Image from "next/image";

import type { MediaItem } from "@/types/site-settings.types";

interface PageBannerProps {
  heading: string;
  subHeading?: string;
  bannerImage?: MediaItem | null;
}

export default function PageBanner({
  heading,
  subHeading,
  bannerImage,
}: PageBannerProps) {
  if (!heading && !subHeading && !bannerImage?.url) {
    return null;
  }

  return (
    <div className="relative flex min-h-[300px] w-full items-center py-[50px] md:py-[80px] lg:py-[130px]">
      {bannerImage?.url ? (
        <Image
          src={bannerImage.url}
          alt={bannerImage.alt || ""}
          fill
          className="absolute inset-0 object-cover"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}
      {/* <div className="absolute inset-0 bg-black/45" /> */}
      <div className="relative z-10 mx-auto flex h-full items-center justify-center">
        <div className="px-5 text-center">
          {subHeading ? (
            <p className="mb-5 text-h5 font-normal uppercase text-white lg:text-h4">
              {subHeading}
            </p>
          ) : null}
          {subHeading && heading ? (
            <div className="mx-auto mb-5 h-1 w-[40px] md:w-[86px]">
              <svg
                width="86"
                height="5"
                viewBox="0 0 86 5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-auto w-full"
              >
                <line y1="2.5" x2="86" y2="2.5" stroke="#CC9900" strokeWidth={5} />
              </svg>
            </div>
          ) : null}
          {heading ? (
            <h1 className="mx-auto text-[30px] font-bold leading-[1.1] text-white sm:text-[36px] md:max-w-4xl md:text-[44px] lg:text-[52px] xl:text-[60px]">
              {heading}
            </h1>
          ) : null}
        </div>
      </div>
    </div>
  );
}
