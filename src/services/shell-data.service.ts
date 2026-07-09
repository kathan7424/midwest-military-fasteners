/**
 * File Name: shell-data.service.ts
 * Description: Single-request shell data for layout (header, footer, site config).
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cache } from "react";

import { isUserLoggedIn } from "@/services/auth.service";
import { fetchFooterMenu, fetchMenu } from "@/services/menu.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import type { FooterMenuItem, MenuItem } from "@/types/menu.types";
import type { SiteSettings } from "@/types/site-settings.types";

export interface WebsiteShellData {
  is_logged_in: boolean;
  settings: SiteSettings | null;
  menu: MenuItem[];
  footer_menu: FooterMenuItem[];
}

/**
 * Fetch header/footer data once per request — avoids duplicate WP calls on navigation.
 */
export const getWebsiteShellData = cache(async (): Promise<WebsiteShellData> => {
  const [is_logged_in, settings, menu, footer_menu] = await Promise.all([
    isUserLoggedIn(),
    fetchSiteSettings().catch(() => null),
    fetchMenu().catch(() => [] as MenuItem[]),
    fetchFooterMenu().catch(() => [] as FooterMenuItem[]),
  ]);

  return {
    is_logged_in,
    settings,
    menu,
    footer_menu,
  };
});
