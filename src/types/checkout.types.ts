/**
 * File Name: checkout.types.ts
 * Description: WooCommerce Store API checkout types.
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

export interface CheckoutAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface ShippingRate {
  rate_id: string;
  name: string;
  description: string;
  price: string;
  currency_minor_unit: number;
  method_id: string;
  selected: boolean;
}

export interface ShippingPackage {
  package_id: number | string;
  name: string;
  shipping_rates: ShippingRate[];
}

export interface CartTotalsSummary {
  subtotal: string;
  shipping_total: string;
  tax_total: string;
  /** Coupon discount — empty string when no coupon is applied. */
  discount_total: string;
  total: string;
}

export interface AppliedCoupon {
  code: string;
  discount: string;
}

export interface CheckoutCartState {
  totals: CartTotalsSummary;
  shipping_packages: ShippingPackage[];
  needs_shipping: boolean;
  shipping_address: Partial<CheckoutAddress>;
  billing_address: Partial<CheckoutAddress>;
  /** Gateway ids WooCommerce offers THIS customer (e.g. stripe, cod=Net 30). */
  payment_methods: string[];
  /** Coupons currently applied to the cart (WC → coupons enabled). */
  coupons: AppliedCoupon[];
}

export interface PaymentResultDetail {
  key: string;
  value: string;
}

export interface CheckoutPlaceOrderResponse {
  order_id: number;
  order_key: string;
  status: string;
  payment_result: {
    payment_status: "success" | "failure" | "pending" | "error";
    payment_details: PaymentResultDetail[];
    redirect_url: string;
  };
  message?: string;
}

export interface CheckoutErrorResponse {
  code?: string;
  message?: string;
}

export interface LocationOption {
  code: string;
  name: string;
}

export interface CheckoutLocations {
  default_country: string;
  countries: LocationOption[];
  states: Record<string, LocationOption[]>;
  /** WC → General → "Shipping location(s)" — may differ from selling locations. */
  shipping_countries?: LocationOption[];
  shipping_states?: Record<string, LocationOption[]>;
  /** WC → Settings → General currency options. */
  currency?: WcCurrencySettings;
  /** WC checkout behavior settings (Accounts & Privacy + customizer). */
  checkout?: WcCheckoutSettings;
}

/** WooCommerce checkout field visibility: hidden | optional | required. */
export type WcFieldVisibility = "hidden" | "optional" | "required";

export interface WcCheckoutSettings {
  guest_checkout: boolean;
  login_reminder: boolean;
  /** Accounts & Privacy → "Allow customers to create an account during checkout". */
  signup_enabled?: boolean;
  /** Accounts & Privacy → Account creation → "On My account page". Controls Register link at login. */
  registration_enabled?: boolean;
  coupons_enabled: boolean;
  /** General → "Enable the use of order notes" — show/hide the Order Notes textarea. */
  order_notes_enabled?: boolean;
  /** WC → Advanced → Terms and conditions page path (relative, e.g. "/terms-conditions"). */
  terms_page_path?: string | null;
  /** WP privacy policy page path (relative, e.g. "/privacy-policy"). */
  privacy_page_path?: string | null;
  fields: {
    company: WcFieldVisibility;
    address_2: WcFieldVisibility;
    phone: WcFieldVisibility;
  };
}

export interface WcCurrencySettings {
  code: string;
  symbol: string;
  position: string;
  decimal_separator: string;
  thousand_separator: string;
  decimals: number;
}
