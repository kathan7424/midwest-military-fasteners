/**
 * File Name: text.utils.ts
 * Description: Text formatting helpers for WordPress API values.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

/**
 * Decode common HTML entities returned by WordPress menus and fields.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}
