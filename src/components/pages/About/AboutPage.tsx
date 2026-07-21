"use client";

import Image from "next/image";

import PageBanner from "@/components/shared_Ui/PageBanner";
import type { AboutPageData } from "@/types/about-page.types";

interface Props {
  pageData: AboutPageData | null;
}

export default function AboutPage({ pageData }: Props) {
  if (!pageData) return null;

  const { heading, sub_heading, banner_image, image, content_heading, content } = pageData;

  const hasContentSection = image?.url || content_heading || content;

  return (
    <section className="bg-white">
      <PageBanner heading={heading} subHeading={sub_heading} bannerImage={banner_image} />

      {/* Image & Content */}
      {hasContentSection ? (
        <div className="mx-auto max-w-[1300px] px-5 py-12 md:py-20">
          <div className="relative flex flex-col justify-start gap-6 lg:flex-row lg:gap-10">
            {/* No image in ACF → no image column; content spans full width. */}
            {image?.url ? (
              <div className="w-full lg:w-[48%]">
                <Image
                  src={image.url}
                  alt={image.alt || ""}
                  width={800}
                  height={800}
                  className="h-auto w-full max-w-[450px] rounded-none lg:max-w-none"
                />
              </div>
            ) : null}
            {(content_heading || content) ? (
              <div
                className={`flex w-full flex-col items-start justify-start gap-5 lg:gap-8 ${
                  image?.url ? "lg:w-[52%]" : ""
                }`}
              >
                {content_heading ? (
                  <h2 className="self-stretch text-left text-2xl font-bold text-black lg:text-3xl">
                    {content_heading}
                  </h2>
                ) : null}
                {content ? (
                  <div
                    className="prose prose-base max-w-none self-stretch text-left text-black"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
