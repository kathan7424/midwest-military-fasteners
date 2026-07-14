/**
 * File Name: AboutPage.tsx
 * Description: About Us page — banner + image/content section from ACF.
 * Developer: Jaimin
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-14
 */

import Image from "next/image";

import type { AboutPageData } from "@/types/about-page.types";

const FALLBACK_BANNER =
  "https://dev-mmf-wp.pantheonsite.io/wp-content/uploads/2026/06/about-banner.webp";
const FALLBACK_CONTENT_IMAGE =
  "https://dev-mmf-wp.pantheonsite.io/wp-content/uploads/2026/06/inspection-report.webp";

interface Props {
  pageData: AboutPageData | null;
}

export default function AboutPage({ pageData }: Props) {
  const heading =
    pageData?.heading ||
    "Mil-spec hardware, inspected, factory certified, with full traceability.";
  const subHeading = pageData?.sub_heading || "OUR PROMISE, OUR STANDARD";
  const bannerUrl = pageData?.banner_image?.url ?? FALLBACK_BANNER;
  const bannerAlt = pageData?.banner_image?.alt || "About banner";

  const contentHeading =
    pageData?.content_heading ||
    "Your First & Final Stop for Standard and Specialty Fasteners.";
  const contentHtml = pageData?.content || "";
  const contentImageUrl = pageData?.image?.url ?? FALLBACK_CONTENT_IMAGE;
  const contentImageAlt = pageData?.image?.alt || "Inspection report";

  return (
    <section className="bg-white">
      {/* Hero */}
      <div className="relative flex min-h-[300px] w-full items-center py-[50px] md:py-[80px] lg:py-[130px]">
        <Image
          src={bannerUrl}
          alt={bannerAlt}
          fill
          className="absolute inset-0 object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 mx-auto flex h-full items-center justify-center">
          <div className="px-5 text-center">
            <p className="mb-5 text-h5 font-normal uppercase text-white lg:text-h4">
              {subHeading}
            </p>
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
            <h1 className="mx-auto text-[30px] font-bold leading-[1.1] text-white sm:text-[36px] md:max-w-4xl md:text-[44px] lg:text-[52px] xl:text-[60px]">
              {heading}
            </h1>
          </div>
        </div>
      </div>

      {/* Image & Content */}
      <div className="mx-auto max-w-[1300px] px-5 py-12 md:py-20">
        <div className="relative flex flex-col justify-start gap-6 lg:flex-row lg:gap-10">
          <div className="w-full lg:w-[48%]">
            <Image
              src={contentImageUrl}
              alt={contentImageAlt}
              width={800}
              height={800}
              className="h-auto w-full max-w-[450px] rounded-none lg:max-w-none"
            />
          </div>
          <div className="flex w-full flex-col items-start justify-start gap-5 lg:w-[52%] lg:gap-8">
            <h2 className="self-stretch text-left text-2xl font-bold text-black lg:text-3xl">
              {contentHeading}
            </h2>
            {contentHtml ? (
              <div
                className="prose prose-base max-w-none self-stretch text-left text-black"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            ) : (
              <div className="self-stretch text-left text-base text-black">
                <p>
                  Dealing on a daily basis with some of the most demanding
                  applications for our products, we understand that quality is
                  of the utmost importance. Reflecting our commitment to
                  providing nothing but quality product with each and every
                  order, we are registered to ISO 9001:2015. All incoming lots
                  of material are inspected, certifications reviewed, and
                  traceability maintained.
                </p>
                <p>
                  A variety of tools are used to ensure that conforming
                  material is shipped. All products we sell and stock have
                  factory certifications.
                </p>
                <p className="mb-0">
                  We are continuously refining and improving our processes
                  and equipment with the sole purpose of proving that we are
                  your First and Final Stop for standard and specialty
                  hardware.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
