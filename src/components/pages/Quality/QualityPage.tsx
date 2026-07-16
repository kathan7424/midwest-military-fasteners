import Image from "next/image";
import Link from "next/link";

import AboutAccordion from "@/components/pages/About/AboutAccordion";
import type { QualityPageData } from "@/types/quality-page.types";

interface Props {
  pageData: QualityPageData | null;
}

export default function QualityPage({ pageData }: Props) {
  if (!pageData) return null;

  const {
    heading, sub_heading, banner_image,
    image, content_heading, content, logo_image, button,
    faq_heading, faq_description, faq_list,
  } = pageData;

  const hasBannerContent = heading || sub_heading || banner_image?.url;
  const hasContentSection = image?.url || content_heading || content || logo_image?.url || button?.url;
  const hasFaqSection = faq_list?.length > 0;

  return (
    <section className="bg-white">
      {/* Hero Banner */}
      {hasBannerContent ? (
        <div className="relative flex min-h-[300px] w-full items-center py-[50px] md:py-[80px] lg:py-[130px]">
          {banner_image?.url ? (
            <Image
              src={banner_image.url}
              alt={banner_image.alt || ""}
              fill
              className="absolute inset-0 object-cover"
              priority
            />
          ) : null}
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative z-10 mx-auto flex h-full items-center justify-center">
            <div className="px-5 text-center">
              {sub_heading ? (
                <p className="mb-5 text-h5 font-normal uppercase text-white lg:text-h4">
                  {sub_heading}
                </p>
              ) : null}
              {(sub_heading && heading) ? (
                <div className="mx-auto mb-5 h-1 w-[40px] md:w-[86px]">
                  <svg width="86" height="5" viewBox="0 0 86 5" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto h-auto w-full">
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
      ) : null}

      {/* Image & Content */}
      {hasContentSection ? (
        <div className="mx-auto max-w-[1300px] px-5 py-12 md:pb-20">
          <div className="relative flex flex-col justify-start gap-6 lg:flex-row lg:gap-10">
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
            {(content_heading || content || logo_image?.url || button?.url) ? (
              <div className={`flex w-full flex-col items-start justify-start gap-5 lg:gap-8 ${image?.url ? "lg:w-[52%]" : ""}`}>
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
                {(logo_image?.url || button?.url) ? (
                  <div className="flex flex-wrap items-center justify-start gap-5 lg:gap-12">
                    {logo_image?.url ? (
                      <Image
                        src={logo_image.url}
                        alt={logo_image.alt || ""}
                        width={164}
                        height={144}
                        className="h-auto w-[164px]"
                      />
                    ) : null}
                    {button?.url ? (
                      <Link
                        href={button.url}
                        target={button.target || undefined}
                        rel={button.target === "_blank" ? "noopener noreferrer" : undefined}
                        className="rounded-none bg-amber px-5 py-3 text-center text-body leading-6 font-bold uppercase text-white hover:bg-[#b38600] md:px-5 md:py-5 md:text-h5"
                      >
                        {button.title || "Learn More"}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* FAQ */}
      {hasFaqSection ? (
        <div className="mx-auto max-w-[1300px] px-5 pb-12 md:pb-20">
          <div className="relative flex flex-col justify-start gap-6 lg:flex-row lg:gap-10">
            <div className="w-full lg:w-[48%]">
              {faq_heading ? (
                <h2 className="mb-5 text-left text-2xl font-semibold text-black">
                  {faq_heading}
                </h2>
              ) : null}
              {faq_description ? (
                <div
                  className="prose prose-base mb-0 max-w-none text-left text-black lg:max-w-[572px]"
                  dangerouslySetInnerHTML={{ __html: faq_description }}
                />
              ) : null}
            </div>
            <div className="flex w-full flex-col items-center justify-start lg:w-[52%]">
              <AboutAccordion items={faq_list} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
