/**
 * File Name: footer.utils.ts
 * Description: Footer display helpers.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

import { decodeHtmlEntities } from "@/utils/text.utils";

/**
 * Replace static year in copyright text with the current year.
 * Supports API values like "Copyright 2026 ..." or "Copyright {year} ...".
 */
export function formatCopyrightText(text: string): string {
  const decoded = decodeHtmlEntities(text);
  const year = String(new Date().getFullYear());

  return decoded
    .replace(/\{year\}/gi, year)
    .replace(/Copyright\s+\d{4}/i, `Copyright ${year}`)
    .replace(/©\s*\d{4}/, `© ${year}`);
}
