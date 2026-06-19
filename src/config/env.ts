/**
 * File Name: env.ts
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

const DEFAULT_WP_API = "https://dev-mmf-wp.pantheonsite.io/wp-json";
const DEFAULT_WC_API = "https://dev-mmf-wp.pantheonsite.io/wp-json/wc/v3";
const DEFAULT_SITE_URL = "http://localhost:3000";

export const ENV = {
  WP_API: process.env.NEXT_PUBLIC_WP_API ?? DEFAULT_WP_API,
  WC_API: process.env.NEXT_PUBLIC_WC_API ?? DEFAULT_WC_API,
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
};
