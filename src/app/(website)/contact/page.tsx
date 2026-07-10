/**
 * File Name: page.tsx
 * Description: Contact page route for the website.
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-08
 */

import type { Metadata } from "next";

import ContactPage from "@/components/pages/Contact/ContactPage";

export const metadata: Metadata = {
  title: "Contact Us | Midwest Military Fasteners",
  description:
    "Reach our sales and support team with questions, RFQs, or product inquiries.",
};

export default function ContactRoutePage() {
  return <ContactPage />;
}
