/**
 * File Name: menu.utils.ts
 * Description: 
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { FooterMenuItem, MenuItem } from "@/types/menu.types";
import { decodeHtmlEntities } from "@/utils/text.utils";

export function getSlugFromPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").toLowerCase();
}

export async function normalizeMenu(items: MenuItem[]): Promise<MenuItem[]> {
  return items.map((item) => ({
    ...item,
    title: decodeHtmlEntities(item.title),
    url: item.url === "/" ? "/" : item.url.toLowerCase(),
    slug: item.slug ? item.slug.toLowerCase() : getSlugFromPath(item.url),
  }));
}

export function normalizeFooterMenu(items: FooterMenuItem[]): FooterMenuItem[] {
  return items.map((item) => ({
    ...item,
    title: decodeHtmlEntities(item.title),
    children: normalizeFooterMenu(item.children ?? []),
  }));
}

export function findMenuItemBySlug(
  items: MenuItem[],
  slug: string
): MenuItem | undefined {
  const normalizedSlug = slug.toLowerCase();

  return items.find(
    (item) =>
      item.slug === normalizedSlug ||
      getSlugFromPath(item.url) === normalizedSlug
  );
}