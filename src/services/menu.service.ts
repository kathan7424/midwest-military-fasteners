/**
 * File Name: menu.service.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import { MenuItem } from "@/types/menu.types";
import { ENV } from "@/config/env";

export async function fetchMenu(): Promise<MenuItem[]> {
  const res = await fetch(`${ENV.WP_API}/custom/v1/menu/primary`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Menu API failed: ${res.status}`);
  }

  return res.json() as Promise<MenuItem[]>;
}
