/**
 * File Name: page.tsx
 * Description: About Us page route for the website.
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-08
 */

import type { Metadata } from "next";

import AboutPage from "@/components/pages/About/AboutPage";

export const metadata: Metadata = {
  title: "About Us | Midwest Military Fasteners",
  description:
    "Learn more about Midwest Military Fasteners and our focus on dependable fastener solutions for critical industries.",
};

export default function AboutRoutePage() {
  return <AboutPage />;
}
