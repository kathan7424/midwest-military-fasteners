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
  if (!text) {
    return "";
  }

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

/**
 * Strip HTML tags from a string, collapsing runs of whitespace.
 * WooCommerce wraps many notice strings in <p> tags — this makes them
 * safe for plain-text contexts (toast messages, aria-labels, etc.).
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Normalize WooCommerce / WordPress notice text for UI display.
 */
export function formatNoticeMessage(message: string): string {
  const decoded = stripHtml(decodeHtmlEntities(message));

  const maxQuantityMatch = decoded.match(
    /maximum quantity of ["']?(.+?)["']? allowed in the cart is (\d+)/i
  );

  if (maxQuantityMatch) {
    return `Maximum quantity for ${maxQuantityMatch[1]} is ${maxQuantityMatch[2]}.`;
  }

  return decoded;
}
