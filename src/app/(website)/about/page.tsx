/**
 * File Name: page.tsx
 * Description: About Us page route — ACF content from WordPress.
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-14
 */

import type { Metadata } from "next";

import AboutPage from "@/components/pages/About/AboutPage";
import { fetch_about_page } from "@/services/about-page.service";

export const metadata: Metadata = {
  title: "About Us | Midwest Military Fasteners",
  description:
    "Learn more about Midwest Military Fasteners and our focus on dependable fastener solutions for critical industries.",
};

export default async function AboutRoutePage() {
  const pageData = await fetch_about_page();

  return <AboutPage pageData={pageData} />;
}
