/**
 * File Name: site-settings.service.ts
 * Description: WordPress site settings API service.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-06-25
 */

import { cache } from "react";

import { fetchWpJson } from "@/services/wp-api.service";
import { SiteSettings } from "@/types/site-settings.types";

export const fetchSiteSettings = cache(async (): Promise<SiteSettings> => {
  return fetchWpJson<SiteSettings>("/custom/v1/site-settings", { mode: "static" });
});
