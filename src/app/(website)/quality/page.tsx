import type { Metadata } from "next";

import QualityPage from "@/components/pages/Quality/QualityPage";
import { fetch_quality_page } from "@/services/quality-page.service";

export const metadata: Metadata = {
  title: "Quality | Midwest Military Fasteners",
  description:
    "ISO 9001:2015 registered — every lot inspected, certified, and fully traceable. Learn about Midwest Military Fasteners' quality standards.",
};

export default async function QualityRoutePage() {
  const pageData = await fetch_quality_page();

  return <QualityPage pageData={pageData} />;
}
