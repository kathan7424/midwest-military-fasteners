/**
 * File Name: menu.service.ts
 * Description: WordPress menu API services.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-25
 */

import { FooterMenuItem, MenuItem } from "@/types/menu.types";
import { fetchWpJson } from "@/services/wp-api.service";
import { normalizeMenu } from "@/utils/menu.utils";

export async function fetchMenu(): Promise<MenuItem[]> {
  const items = await fetchWpJson<MenuItem[]>("/custom/v1/menu/primary");
  return await normalizeMenu(items);
}

export async function fetchFooterMenu(): Promise<FooterMenuItem[]> {
  return fetchWpJson<FooterMenuItem[]>("/custom/v1/menu/footer");
}
