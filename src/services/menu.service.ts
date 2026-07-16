/**
 * File Name: menu.service.ts
 * Description: WordPress menu API services.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-25
 */

import { cache } from "react";

import { FooterMenuItem, MenuItem } from "@/types/menu.types";
import { fetchWpJson } from "@/services/wp-api.service";
import { normalizeFooterMenu, normalizeMenu } from "@/utils/menu.utils";

export const fetchMenu = cache(async (): Promise<MenuItem[]> => {
  const items = await fetchWpJson<MenuItem[]>("/custom/v1/menu/primary", {
    mode: "static",
    tags: ["menu-primary"],
  });
  return await normalizeMenu(items);
});

export const fetchFooterMenu = cache(async (): Promise<FooterMenuItem[]> => {
  const items = await fetchWpJson<FooterMenuItem[]>("/custom/v1/menu/footer", {
    mode: "static",
    tags: ["menu-footer"],
  });
  return normalizeFooterMenu(items);
});
