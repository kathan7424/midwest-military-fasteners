/**
 * File Name: date.utils.ts
 * Description: Date display helpers — US formatting for API date strings.
 * Developer: KP-184
 * Created Date: 2026-07-13
 */

/**
 * Format an ISO-style date string (YYYY-MM-DD, with or without a time part)
 * as US MM-DD-YY. String-split on purpose: `new Date("2026-07-13")` parses as
 * UTC midnight and shifts a day back in US timezones.
 * Unparsable input is returned unchanged.
 */
export function format_us_date(value?: string | null): string {
  const raw = value?.trim() ?? "";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return raw;
  }

  const [, year, month, day] = match;

  return `${month}-${day}-${year.slice(-2)}`;
}
