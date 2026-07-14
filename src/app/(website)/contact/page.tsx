/**
 * File Name: page.tsx
 * Description: Contact page — ACF heading/banner from WP, form submits to Gravity Forms.
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-14
 */

import type { Metadata } from "next";

import ContactPage from "@/components/pages/Contact/ContactPage";
import { fetch_contact_page } from "@/services/contact.service";

export const metadata: Metadata = {
  title: "Contact Us | Midwest Military Fasteners",
  description:
    "Reach our sales and support team with questions, RFQs, or product inquiries.",
};

export default async function ContactRoutePage() {
  const pageData = await fetch_contact_page();

  return <ContactPage pageData={pageData} />;
}
