/**
 * File Name: menu.service.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import axios from "axios";

import { MenuItem } from "@/types/menu.types";
import { ENV } from "@/config/env";

export async function fetchMenu(): Promise<MenuItem[]> {
  const { data } = await axios.get<MenuItem[]>(
    `${ENV.WP_API}/custom/v1/menu/primary`,
    {
      params: { _: Date.now() },
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );

  return data;
}
