/**
 * File Name: site-settings.types.ts
 * Description: Site settings model types.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-07-10
 */

export interface LinkField {
  title: string;
  url: string;
  target: string;
}

export interface MediaItem {
  id: number;
  url: string;
  alt: string;
  title: string;
}

export interface BrandingSettings {
  site_title: string;
  tagline: string;
  display_text: boolean;
  logo: MediaItem | null;
  favicon: MediaItem | null;
}

export interface HeaderSettings {
  email: string;
  phone: string;
  register_button: LinkField | null;
  login_button: LinkField | null;
  show_search_bar?: boolean;
}

export interface FooterSettings {
  iso_logo: MediaItem | null;
  iso_title: string | null;
  content_area: string;
  copy_right_text: LinkField | null;
  build_by_text: string;
  build_by_link: LinkField | null;
}

export interface SeoAnalyticsSettings {
  gtm_id: string;
  ga4_id: string;
  default_og_image: string;
}

export interface SiteSettings {
  branding: BrandingSettings;
  header: HeaderSettings;
  footer: FooterSettings;
  woocommerce?: WooCommerceSettings;
  seoAnalytics?: SeoAnalyticsSettings;
}

export interface WooCommerceSettings {
  shop_page_id: number;
  shop_page_slug: string;
  shop_page_path: string;
  cart_page_slug: string;
  cart_page_path: string;
  checkout_page_slug: string;
  checkout_page_path: string;
  myaccount_page_slug: string;
  myaccount_page_path: string;
}
