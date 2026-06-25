/**
 * File Name: menu.service.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { MenuItem } from "@/types/menu.types";
import { ENV } from "@/config/env";
import { normalizeMenu } from "@/utils/menu.utils";

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(
    `${ENV.WP_API}/custom/v1/menu/primary?_=${Date.now()}`,
    {
      cache: "no-store",
      next: { revalidate: 0 },
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Menu API failed: ${res.status}`);
  }

  const items = (await res.json()) as MenuItem[];
  return normalizeMenu(items);
}
