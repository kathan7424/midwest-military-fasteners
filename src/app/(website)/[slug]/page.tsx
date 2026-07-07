/**
 * File Name: page.tsx
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { notFound } from "next/navigation";

import WpPageContent from "@/components/pages/WpPageContent/WpPageContent";
import { fetchMenu } from "@/services/menu.service";
import { fetchPageBySlug } from "@/services/page.service";
import { MenuItem } from "@/types/menu.types";
import { findMenuItemBySlug } from "@/utils/menu.utils";
import type { Metadata } from "next";
import { fetchYoastBySlug } from "@/services/seo.service";
import { buildYoastMetadata } from "@/utils/seo.utils";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();

  let menu: MenuItem[] = [];

  try {
    menu = await fetchMenu();
  } catch (error) {
    console.error("Menu fetch failed:", error);
  }

  const menuItem = findMenuItemBySlug(menu, normalizedSlug);

  let wpPage = null;

  try {
    wpPage = await fetchPageBySlug(normalizedSlug);
  } catch (error) {
    console.error("Page fetch failed:", error);
  }

  if (!menuItem && !wpPage) {
    notFound();
  }

  const pageTitle = wpPage?.title.rendered ?? menuItem?.title ?? "";
  const pageContent = wpPage?.content.rendered;

  if (!pageTitle && !pageContent) {
    notFound();
  }

  return (
    <WpPageContent
      title={pageTitle || undefined}
      content={pageContent}
    />
  );
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const yoast = await fetchYoastBySlug(slug.toLowerCase());
    return buildYoastMetadata(yoast);
  } catch {
    return buildYoastMetadata();
  }
}