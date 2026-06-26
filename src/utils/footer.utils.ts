/**
 * File Name: footer.utils.ts
 * Description: Footer display helpers.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

/**
 * Replace static year in copyright text with the current year.
 * Supports API values like "Copyright 2026 ..." or "Copyright {year} ...".
 */
export function formatCopyrightText(text: string): string {
  const year = String(new Date().getFullYear());

  return text
    .replace(/\{year\}/gi, year)
    .replace(/Copyright\s+\d{4}/i, `Copyright ${year}`)
    .replace(/©\s*\d{4}/, `© ${year}`);
}
