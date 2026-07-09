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
  total: string;
}

export interface CheckoutCartState {
  totals: CartTotalsSummary;
  shipping_packages: ShippingPackage[];
  needs_shipping: boolean;
  shipping_address: Partial<CheckoutAddress>;
  billing_address: Partial<CheckoutAddress>;
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
}
