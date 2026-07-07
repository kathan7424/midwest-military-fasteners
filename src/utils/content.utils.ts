/**
 * File Name: content.utils.ts
 * Description: Helpers for conditional rendering when API data is missing.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

/**
 * Returns true when a plain-text value is present and not blank.
 */
export function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

/**
 * Returns true when HTML content has visible text after stripping tags.
 */
export function hasHtmlContent(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  const stripped = value.replace(/<[^>]*>/g, "").trim();
  return stripped.length > 0;
}
