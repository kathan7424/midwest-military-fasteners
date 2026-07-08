/**
 * File Name: AboutPage.tsx
 * Description: Static About Us page for the website.
 * Developer: Jaimin
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-08
 */

import Image from "next/image";
import Link from "next/link";
import AboutAccordion from "./AboutAccordion";
import { PUBLIC_ROUTES } from "@/config/routes";

const faqItems = [
    {
        q: "What certifications do you maintain?",
        a: "We are registered to ISO 9001:2015 and review certifications for incoming lots. All material is inspected and traceability is maintained.",
    },
    {
        q: "Can you source specialty fasteners?",
        a: "Yes — we support specialty and mil-spec hardware. Contact our sales team with requirements and we will source or quote accordingly.",
    },
    {
        q: "How do I request a quote or certification?",
        a: "Use the Contact Us page or call our sales line; provide the part number and any required certification or inspection needs.",
    },
    {
        q: "Do you ship internationally?",
        a: "Yes — we ship globally. Shipping terms depend on the account and order size; contact our support team for details.",
    },
];

export default function AboutPage() {
    return (
        <section className="bg-white">
            {/* Hero */}
            <div className="flex items-center relative w-full min-h-[300px] py-[50px] md:py-[80px] lg:py-[130px]">
                <img
                    src="https://dev-mmf-wp.pantheonsite.io/wp-content/uploads/2026/06/about-banner.webp"
                    alt="About banner"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/45" />
                <div className="mx-auto relative z-10 flex h-full items-center justify-center">
                    <div className="px-5 text-center">
                        <p className="mb-5 text-h5 lg:text-h4 font-normal uppercase text-white">OUR PROMISE, OUR STANDARD</p>
                        <div className="mx-auto mb-5 w-[40px] md:w-[86px] h-1">
                            <svg width="86" height="5" viewBox="0 0 86 5" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto w-full h-auto">
                                <line y1="2.5" x2="86" y2="2.5" stroke="#CC9900" strokeWidth={5} />
                            </svg>
                        </div>
                        <h1 className="mx-auto md:max-w-4xl font-bold text-white text-[30px] sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[60px] leading-[1.1]">Mil-spec hardware, inspected, factory certified, with full traceability.</h1>
                    </div>
                </div>
            </div>

            {/* Overview */}
            <div className="max-w-[1300px] mx-auto px-5 py-12 md:pb-20">
                <div className="flex flex-col lg:flex-row justify-start relative gap-6 lg:gap-10">
                    <div className="w-full lg:w-[48%]">
                        <img src="https://dev-mmf-wp.pantheonsite.io/wp-content/uploads/2026/06/inspection-report.webp" alt="Inspection report" className="w-full h-auto rounded-none max-w-[450px] lg:max-w-none" />
                    </div>
                    <div className="w-full lg:w-[52%] flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 gap-5 lg:gap-8">
                        <div className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 relative gap-5 lg:gap-8">
                            <h2 className="self-stretch flex-grow-0 flex-shrink-0 text-2xl lg:text-3xl font-bold text-left text-black">
                                Your First &amp; Final Stop for Standard and Specialty Fasteners.
                            </h2>
                            <div className="self-stretch flex-grow-0 flex-shrink-0 text-base text-left text-black">
                                <p className="self-stretch flex-grow-0 flex-shrink-0 text-base text-left text-black">
                                    Dealing on a daily basis with some of the most demanding applications for our products, we understand that quality is of the utmost importance. Reflecting our commitment to providing nothing but quality product with each and every order, we are registered to ISO 9001:2015. All incoming lots of material are inspected, certifications reviewed, and traceability maintained.
                                </p>

                                <p className="self-stretch flex-grow-0 flex-shrink-0 text-base text-left text-black">
                                    A variety of tools are used to ensure that conforming material is shipped. All products we sell and stock have factory certifications.
                                </p>
                                <p className="mb-0 self-stretch flex-grow-0 flex-shrink-0 text-base text-left text-black">
                                    We are continuously refining and improving our processes and equipment with the sole purpose of proving that we are your First and Final Stop for standard and specialty hardware.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-start items-center flex-wrap flex-grow-0 flex-shrink-0 relative gap-5 lg:gap-12">
                            <Link href="/" prefetch={false} className="block shrink-0">
                                <Image
                                    src="/images/ISO_9001-2015-logo.svg"
                                    alt="Midwest Military Fasteners"
                                    width={164}
                                    height={144}
                                    className="h-auto w-[164px]"
                                />
                            </Link>
                            <Link href="#" className="rounded-none bg-amber px-5 py-3 md:px-6 md:py-5 text-body md:text-h5 font-bold uppercase text-white hover:bg-[#b38600]">Download ISO Certification</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* FAQ */}
            <div className="max-w-[1300px] mx-auto px-5 pb-12 md:pb-20">
                <div className="flex flex-col lg:flex-row justify-start relative gap-6 lg:gap-10">
                    <div className="w-full lg:w-[48%]">
                        <h2 className="mb-5 text-2xl font-semibold text-left text-black">
                            Frequently Asked Questions
                        </h2>
                        <p className="mb-0 text-base text-left text-black lg:max-w-[572px]">
                            Dealing on a daily basis with some of the most demanding applications for our products, we understand that quality is of the utmost importance. Reflecting our commitment to providing nothing but quality product with each and every order.
                        </p>
                    </div>
                    <div className="w-full lg:w-[52%] flex flex-col justify-start items-center">
                        <AboutAccordion items={faqItems} />
                    </div>
                </div>
            </div>
        </section>
    );
}
