/**
 * File Name: CheckoutPageView.tsx
 * Description: Headless WooCommerce Store API checkout with Stripe card payment.
 *   Flow: load cart state → address → shipping rates (Shippo via WC) →
 *   Stripe PaymentMethod → POST /wc/store/v1/checkout → success page.
 * Developer: KP-184
 * Created Date: 2026-07-08
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import CartTaxExemptionNotice from "@/components/pages/Cart/CartTaxExemptionNotice";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { useCartStore } from "@/stores/cart.store";
import {
  fetch_checkout_locations,
  fetch_checkout_state,
  place_order,
  select_shipping_rate,
  update_checkout_address,
  type CheckoutStateResponse,
} from "@/services/checkout.client";
import type { CartData } from "@/types/cart.types";
import type {
  CheckoutAddress,
  CheckoutCartState,
  CheckoutLocations,
} from "@/types/checkout.types";
import { notifyError } from "@/utils/notifications";

const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

const EMPTY_ADDRESS: CheckoutAddress = {
  first_name: "",
  last_name: "",
  company: "",
  address_1: "",
  address_2: "",
  city: "",
  state: "",
  postcode: "",
  country: "US",
  email: "",
  phone: "",
};

const INPUT_CLASS =
  "w-full border border-light-gray bg-white px-4 py-3 text-link text-near-black outline-none transition-colors focus:border-blue";

function AddressSelectField({
  label,
  name,
  value,
  options,
  onChange,
  required = false,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: keyof CheckoutAddress;
  value: string;
  options: Array<{ code: string; name: string }>;
  onChange: (name: keyof CheckoutAddress, value: string) => void;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-near-black">
        {label}
        {required ? <span className="text-[#E12222]"> *</span> : null}
      </span>
      <select
        name={name}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(name, event.target.value)}
        className={`${INPUT_CLASS} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%2350575e%22 stroke-width=%222%22 fill=%22none%22/></svg>')] bg-[position:right_16px_center] bg-no-repeat pr-10`}
      >
        <option value="">{placeholder ?? `Select ${label.toLowerCase()}...`}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function AddressField({
  label,
  name,
  value,
  onChange,
  required = false,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: keyof CheckoutAddress;
  value: string;
  onChange: (name: keyof CheckoutAddress, value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-near-black">
        {label}
        {required ? <span className="text-[#E12222]"> *</span> : null}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(name, event.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function OrderSummary({
  cart,
  checkout,
}: {
  cart: CartData;
  checkout: CheckoutCartState;
}) {
  return (
    <aside className="h-fit border border-light-gray bg-off-white p-6">
      <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
        Order Summary
      </h2>

      <ul className="mb-5 space-y-3 border-b border-light-gray pb-5">
        {cart.items.map((item) => (
          <li key={item.key} className="flex items-start justify-between gap-4 text-link">
            <span className="min-w-0">
              <span className="block font-semibold text-near-black">
                {item.sku || item.name}
              </span>
              <span className="text-dark-gray">Qty: {item.quantity}</span>
            </span>
            <span
              className="whitespace-nowrap text-near-black"
              dangerouslySetInnerHTML={{ __html: item.price_html }}
            />
          </li>
        ))}
      </ul>

      <dl className="space-y-2 text-link">
        <div className="flex justify-between">
          <dt className="text-dark-gray">Subtotal</dt>
          <dd className="text-near-black">{checkout.totals.subtotal}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-dark-gray">Shipping</dt>
          <dd className="text-near-black">{checkout.totals.shipping_total}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-dark-gray">Tax</dt>
          <dd className="text-near-black">{checkout.totals.tax_total}</dd>
        </div>
        <div className="flex justify-between border-t border-light-gray pt-3 text-body font-bold">
          <dt className="text-near-black">Total</dt>
          <dd className="text-near-black">{checkout.totals.total}</dd>
        </div>
      </dl>
    </aside>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const setCart = useCartStore((state) => state.setCart);

  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCartState] = useState<CartData | null>(null);
  const [checkout, setCheckout] = useState<CheckoutCartState | null>(null);
  const [locations, setLocations] = useState<CheckoutLocations | null>(null);
  const [address, setAddress] = useState<CheckoutAddress>(EMPTY_ADDRESS);
  // WooCommerce-standard "Ship to a different address?" — unchecked means
  // shipping = billing (WC default behavior).
  const [shipToDifferent, setShipToDifferent] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddress>(EMPTY_ADDRESS);
  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [orderNote, setOrderNote] = useState("");

  const applyState = useCallback(
    (data: CheckoutStateResponse) => {
      setCartState(data.cart);
      setCheckout(data.checkout);
      setCart(data.cart);
    },
    [setCart]
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      // Locations (WC allowed countries/states) load in parallel with the cart.
      const [stateResult, locationsResult] = await Promise.all([
        fetch_checkout_state(),
        fetch_checkout_locations(),
      ]);

      if (!active) {
        return;
      }

      if (locationsResult) {
        setLocations(locationsResult);

        if (locationsResult.default_country) {
          setAddress((current) =>
            current.country
              ? current
              : { ...current, country: locationsResult.default_country }
          );
          setShippingAddress((current) =>
            current.country
              ? current
              : { ...current, country: locationsResult.default_country }
          );
        }
      }

      const { ok, data } = stateResult;

      if (ok && "cart" in data) {
        applyState(data);

        const saved = data.checkout.shipping_address;
        if (saved?.address_1) {
          setAddress((current) => ({ ...current, ...saved }));
        }
      }

      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [applyState]);

  const handleAddressChange = (name: keyof CheckoutAddress, value: string) => {
    setAddress((current) => {
      // WooCommerce behavior: changing country resets the state selection.
      if (name === "country" && value !== current.country) {
        return { ...current, country: value, state: "" };
      }

      return { ...current, [name]: value };
    });
  };

  const handleShippingChange = (name: keyof CheckoutAddress, value: string) => {
    setShippingAddress((current) => {
      if (name === "country" && value !== current.country) {
        return { ...current, country: value, state: "" };
      }

      return { ...current, [name]: value };
    });
  };

  const countryStates = locations?.states[address.country] ?? [];
  const hasStatesList = countryStates.length > 0;
  const shippingCountryStates = locations?.states[shippingAddress.country] ?? [];
  const hasShippingStatesList = shippingCountryStates.length > 0;

  // WooCommerce rule: rates + tax follow the SHIPPING address.
  const effectiveShipping = shipToDifferent ? shippingAddress : address;

  const isAddressComplete = (value: CheckoutAddress, needsEmail: boolean) =>
    Boolean(
      value.first_name &&
        value.last_name &&
        value.address_1 &&
        value.city &&
        value.state &&
        value.postcode &&
        value.country &&
        (!needsEmail || value.email)
    );

  const addressReady = useMemo(
    () =>
      isAddressComplete(address, true) &&
      (!shipToDifferent || isAddressComplete(shippingAddress, false)),
    [address, shippingAddress, shipToDifferent]
  );

  // Address complete → WooCommerce recalculates shipping (Shippo) + tax.
  const refreshRates = useCallback(async () => {
    if (!addressReady) {
      return;
    }

    setIsUpdatingRates(true);

    const { ok, data } = await update_checkout_address({
      shipping_address: effectiveShipping,
      billing_address: address,
    });

    if (ok && "cart" in data) {
      applyState(data);
    } else if ("message" in data && data.message) {
      notifyError(data.message);
    }

    setIsUpdatingRates(false);
  }, [address, effectiveShipping, addressReady, applyState]);

  // WooCommerce-style auto-recalculation: when the address is complete,
  // shipping + tax refresh automatically (debounced) — no button click needed.
  const addressKey = useMemo(
    () =>
      [
        address.address_1,
        address.city,
        address.state,
        address.postcode,
        address.country,
        shipToDifferent ? "ship" : "same",
        effectiveShipping.address_1,
        effectiveShipping.city,
        effectiveShipping.state,
        effectiveShipping.postcode,
        effectiveShipping.country,
      ].join("|"),
    [address, effectiveShipping, shipToDifferent]
  );

  useEffect(() => {
    if (!addressReady || isLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshRates();
    }, 800);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressKey, addressReady, isLoading]);

  const handleSelectRate = async (
    package_id: number | string,
    rate_id: string
  ) => {
    setIsUpdatingRates(true);

    const { ok, data } = await select_shipping_rate({ package_id, rate_id });

    if (ok && "cart" in data) {
      applyState(data);
    } else if ("message" in data && data.message) {
      notifyError(data.message);
    }

    setIsUpdatingRates(false);
  };

  const handlePlaceOrder = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      notifyError("Payment system is still loading — try again in a moment.");
      return;
    }

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      notifyError("Card details are required.");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: `${address.first_name} ${address.last_name}`.trim(),
          email: address.email,
          phone: address.phone || undefined,
          address: {
            line1: address.address_1,
            line2: address.address_2 || undefined,
            city: address.city,
            state: address.state,
            postal_code: address.postcode,
            country: address.country,
          },
        },
      });

      if (error || !paymentMethod) {
        notifyError(error?.message || "Card could not be processed.");
        return;
      }

      const { ok, data } = await place_order({
        billing_address: address,
        shipping_address: effectiveShipping,
        payment_method: "stripe",
        // Keys required by the WooCommerce Stripe Gateway (UPE/deferred intent).
        payment_data: [
          { key: "payment_method", value: "stripe" },
          { key: "wc-stripe-payment-method", value: paymentMethod.id },
          { key: "wc-stripe-is-deferred-intent", value: true },
        ],
        customer_note: orderNote.trim(),
      });

      if (!ok || !("order_id" in data)) {
        notifyError(data.message || "Order could not be placed.");
        return;
      }

      const paymentResult = data.payment_result;
      const paymentStatus = paymentResult?.payment_status;
      const redirectUrl = paymentResult?.redirect_url ?? "";

      // 3D Secure: the gateway signals it via a confirm hash in redirect_url
      // (#wc-stripe-confirm-pi:<order>:<client_secret>:<nonce>).
      const secretMatch = redirectUrl.match(/confirm-pi:[^:]*:((pi|seti)_[^:#]+_secret_[^:#]+)/);

      if (secretMatch) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          secretMatch[1]
        );

        if (confirmError) {
          notifyError(confirmError.message || "Card authentication failed.");
          return;
        }
      } else if (paymentStatus !== "success" && paymentStatus !== "pending") {
        notifyError(data.message || "Payment failed — please try another card.");
        return;
      }

      setCart(null);

      const successParams = new URLSearchParams({
        order_id: String(data.order_id),
        total: checkout?.totals.total ?? "",
        email: address.email ?? "",
      });

      router.push(`/checkout/success?${successParams.toString()}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (isLoading || cart === null || checkout === null) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]" aria-busy="true">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-full max-w-[420px]" />
          <SkeletonBlock className="h-4 w-full max-w-[360px]" />
          <SkeletonBlock className="h-4 w-full max-w-[400px]" />
        </div>
        <SkeletonBlock className="h-64 w-full" />
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div>
        <p className="mb-6 text-body text-dark-gray">
          Your cart is empty — add products before checking out.
        </p>
        <Link
          href="/cart"
          className="inline-flex items-center bg-amber px-8 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue"
        >
          Back to Cart
        </Link>
      </div>
    );
  }

  const shippingRates = checkout.shipping_packages;

  return (
    <form
      onSubmit={handlePlaceOrder}
      className="grid gap-10 lg:grid-cols-[1fr_380px]"
    >
      <div>
        <section className="mb-10">
          <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
            Billing &amp; Shipping
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <AddressField label="First name" name="first_name" value={address.first_name} onChange={handleAddressChange} required autoComplete="given-name" />
            <AddressField label="Last name" name="last_name" value={address.last_name} onChange={handleAddressChange} required autoComplete="family-name" />
            <div className="sm:col-span-2">
              <AddressField label="Company" name="company" value={address.company ?? ""} onChange={handleAddressChange} autoComplete="organization" />
            </div>
            <div className="sm:col-span-2">
              <AddressField label="Street address" name="address_1" value={address.address_1} onChange={handleAddressChange} required autoComplete="address-line1" />
            </div>
            <div className="sm:col-span-2">
              <AddressField label="Apartment, suite, etc." name="address_2" value={address.address_2 ?? ""} onChange={handleAddressChange} autoComplete="address-line2" />
            </div>
            {locations ? (
              <AddressSelectField
                label="Country"
                name="country"
                value={address.country}
                options={locations.countries}
                onChange={handleAddressChange}
                required
                autoComplete="country"
              />
            ) : (
              <AddressField label="Country" name="country" value={address.country} onChange={handleAddressChange} required autoComplete="country" />
            )}
            {hasStatesList ? (
              <AddressSelectField
                label="State"
                name="state"
                value={address.state}
                options={countryStates}
                onChange={handleAddressChange}
                required
                autoComplete="address-level1"
              />
            ) : (
              <AddressField label="State / Province" name="state" value={address.state} onChange={handleAddressChange} required autoComplete="address-level1" />
            )}
            <AddressField label="City" name="city" value={address.city} onChange={handleAddressChange} required autoComplete="address-level2" />
            <AddressField label="ZIP code" name="postcode" value={address.postcode} onChange={handleAddressChange} required autoComplete="postal-code" />
            <AddressField label="Email" name="email" type="email" value={address.email ?? ""} onChange={handleAddressChange} required autoComplete="email" />
            <AddressField label="Phone" name="phone" type="tel" value={address.phone ?? ""} onChange={handleAddressChange} autoComplete="tel" />
          </div>

          {/* WooCommerce-standard "Ship to a different address?" */}
          <label className="mt-6 flex cursor-pointer items-center gap-3 text-body font-bold uppercase text-near-black">
            <input
              type="checkbox"
              checked={shipToDifferent}
              onChange={(event) => setShipToDifferent(event.target.checked)}
              className="h-4 w-4 accent-amber"
            />
            Ship to a different address?
          </label>

          {shipToDifferent ? (
            <div className="mt-5 grid gap-4 border-t border-light-gray pt-5 sm:grid-cols-2">
              <AddressField label="First name" name="first_name" value={shippingAddress.first_name} onChange={handleShippingChange} required autoComplete="shipping given-name" />
              <AddressField label="Last name" name="last_name" value={shippingAddress.last_name} onChange={handleShippingChange} required autoComplete="shipping family-name" />
              <div className="sm:col-span-2">
                <AddressField label="Company" name="company" value={shippingAddress.company ?? ""} onChange={handleShippingChange} autoComplete="shipping organization" />
              </div>
              <div className="sm:col-span-2">
                <AddressField label="Street address" name="address_1" value={shippingAddress.address_1} onChange={handleShippingChange} required autoComplete="shipping address-line1" />
              </div>
              <div className="sm:col-span-2">
                <AddressField label="Apartment, suite, etc." name="address_2" value={shippingAddress.address_2 ?? ""} onChange={handleShippingChange} autoComplete="shipping address-line2" />
              </div>
              {locations ? (
                <AddressSelectField
                  label="Country"
                  name="country"
                  value={shippingAddress.country}
                  options={locations.countries}
                  onChange={handleShippingChange}
                  required
                  autoComplete="shipping country"
                />
              ) : (
                <AddressField label="Country" name="country" value={shippingAddress.country} onChange={handleShippingChange} required autoComplete="shipping country" />
              )}
              {hasShippingStatesList ? (
                <AddressSelectField
                  label="State"
                  name="state"
                  value={shippingAddress.state}
                  options={shippingCountryStates}
                  onChange={handleShippingChange}
                  required
                  autoComplete="shipping address-level1"
                />
              ) : (
                <AddressField label="State / Province" name="state" value={shippingAddress.state} onChange={handleShippingChange} required autoComplete="shipping address-level1" />
              )}
              <AddressField label="City" name="city" value={shippingAddress.city} onChange={handleShippingChange} required autoComplete="shipping address-level2" />
              <AddressField label="ZIP code" name="postcode" value={shippingAddress.postcode} onChange={handleShippingChange} required autoComplete="shipping postal-code" />
            </div>
          ) : null}

          {isUpdatingRates ? (
            <p className="mt-4 text-link text-dark-gray" role="status">
              Updating shipping &amp; tax for your address...
            </p>
          ) : null}

          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm font-semibold text-near-black">
              Order notes (optional)
            </span>
            <textarea
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
              rows={3}
              placeholder="Notes about your order, e.g. special delivery instructions."
              className={`${INPUT_CLASS} resize-y`}
            />
          </label>
        </section>

        {checkout.needs_shipping && shippingRates.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
              Shipping Method
            </h2>

            {shippingRates.map((pkg) => (
              <ul key={pkg.package_id} className="space-y-2">
                {pkg.shipping_rates.map((rate) => (
                  <li key={rate.rate_id}>
                    <label className="flex cursor-pointer items-center justify-between gap-4 border border-light-gray bg-white px-4 py-3 transition-colors has-[:checked]:border-blue">
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`shipping-${pkg.package_id}`}
                          checked={rate.selected}
                          disabled={isUpdatingRates}
                          onChange={() =>
                            void handleSelectRate(pkg.package_id, rate.rate_id)
                          }
                        />
                        <span className="text-link text-near-black">
                          {rate.name}
                        </span>
                      </span>
                      <span className="text-link font-semibold text-near-black">
                        {rate.price}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ))}
          </section>
        ) : null}

        <section>
          <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
            Payment
          </h2>

          <div className="border border-light-gray bg-white p-4">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#1d2327",
                    "::placeholder": { color: "#8c8f94" },
                  },
                },
              }}
              onChange={(event) => setCardComplete(event.complete)}
            />
          </div>

          <button
            type="submit"
            disabled={
              !addressReady || !cardComplete || isPlacingOrder || isUpdatingRates
            }
            className="mt-6 inline-flex w-full items-center justify-center bg-amber px-8 py-4 text-body font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50 sm:w-auto"
          >
            {isPlacingOrder ? "Placing Order..." : `Place Order — ${checkout.totals.total}`}
          </button>
        </section>
      </div>

      <OrderSummary cart={cart} checkout={checkout} />
    </form>
  );
}

export default function CheckoutPageView() {
  if (!stripePromise) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="mb-4 text-h2 font-bold uppercase text-near-black">Checkout</h1>
        <p className="text-body text-dark-gray">
          Payment is not configured — set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in
          the environment and reload.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-8 xl:px-5 xl:py-[40px]">
      <h1 className="mb-6 text-[28px] font-bold uppercase leading-heading text-near-black sm:text-h2">
        Checkout
      </h1>

      {/* SOW: pending/expired exemption status notice at checkout */}
      <div className="mb-6">
        <CartTaxExemptionNotice />
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}
