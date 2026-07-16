import Image from "next/image";

import type { ContactPageData } from "@/types/contact.types";
import ContactForm from "./ContactForm";

interface Props {
  pageData: ContactPageData | null;
}

export default function ContactPage({ pageData }: Props) {
  const heading = pageData?.heading || "";
  const subHeading = pageData?.sub_heading || "";
  const bannerUrl = pageData?.banner_image?.url ?? "";
  const bannerAlt = pageData?.banner_image?.alt || "";

  return (
      <section className="relative overflow-hidden bg-slate-950">
        <div className="px-5 flex items-center flex-col relative w-full py-[50px] md:py-[80px] lg:py-[130px]">
          {bannerUrl ? (
            <Image
              src={bannerUrl}
              alt={bannerAlt}
              fill
              className="absolute inset-0 object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gray-700" />
          )}
          <div className="absolute inset-0 bg-black/45" />
          <div className="mx-auto relative z-10 flex h-full items-center justify-center">
            <div className="text-center">
              {subHeading ? (
                <p className="mb-5 text-h5 lg:text-h4 font-normal uppercase text-white">
                  {subHeading}
                </p>
              ) : null}
              {(subHeading && heading) ? (
                <div className="mx-auto mb-5 w-[40px] md:w-[86px] h-1">
                  <svg
                    width="86"
                    height="5"
                    viewBox="0 0 86 5"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mx-auto w-full h-auto"
                  >
                    <line y1="2.5" x2="86" y2="2.5" stroke="#CC9900" strokeWidth={5} />
                  </svg>
                </div>
              ) : null}
              {heading ? (
                <h1 className="mx-auto md:max-w-4xl font-bold text-white text-[30px] sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[60px] leading-[1.1]">
                  {heading}
                </h1>
              ) : null}
            </div>
          </div>
          <div className="relative z-10 mx-auto mt-10 lg:mt-[58px] w-full max-w-[505px]">
            <ContactForm />
          </div>
        </div>
      </section>
  );
}
