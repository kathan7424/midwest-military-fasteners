/**
 * File Name: menu.utils.ts
 * Description: 
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { MenuItem } from "@/types/menu.types";

export function getSlugFromPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").toLowerCase();
}

export function normalizeMenu(items: MenuItem[]): MenuItem[] {
  return items.map((item) => ({
    ...item,
    url: item.url === "/" ? "/" : item.url.toLowerCase(),
    slug: item.slug ? item.slug.toLowerCase() : getSlugFromPath(item.url),
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