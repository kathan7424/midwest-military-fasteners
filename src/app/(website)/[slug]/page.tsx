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
import {
  findMenuItemBySlug,
  normalizeMenu,
} from "@/utils/menu.utils";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();

  let menu: MenuItem[] = [];

  try {
    menu = normalizeMenu(await fetchMenu());
  } catch (error) {
    console.error("Menu fetch failed:", error);
    notFound();
  }

  const menuItem = findMenuItemBySlug(menu, normalizedSlug);

  if (!menuItem) {
    notFound();
  }

  const wpPage = await fetchPageBySlug(normalizedSlug);

  return (
    <WpPageContent
      title={wpPage?.title.rendered ?? menuItem.title}
      content={wpPage?.content.rendered}
    />
  );
}
