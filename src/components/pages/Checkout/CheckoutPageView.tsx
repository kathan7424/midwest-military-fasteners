/**
 * File Name: CheckoutPageView.tsx
 * Description: Headless WooCommerce Store API checkout with Stripe card payment.
 *   Flow: load cart state → address → shipping rates (Shippo via WC) →
 *   Stripe PaymentMethod → POST /wc/store/v1/checkout → success page.
 * Developer: KP-184
 * Created Date: 2026-07-08
 * Last Modified: 2026-07-10
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeCardNumberElement, StripeCardExpiryElement, StripeCardCvcElement } from "@stripe/stripe-js";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import CartTaxExemptionNotice from "@/components/pages/Cart/CartTaxExemptionNotice";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { Loader2, ShieldCheck } from "lucide-react";
import { useCartStore } from "@/stores/cart.store";
import {
  apply_coupon,
  fetch_checkout_locations,
  fetch_checkout_state,
  place_order,
  remove_coupon,
  select_shipping_rate,
  update_checkout_address,
  verify_payment_intent,
  type CheckoutStateResponse,
} from "@/services/checkout.client";
import { API_ROUTES } from "@/config/routes";
import type { CartData } from "@/types/cart.types";
import type {
  CheckoutAddress,
  CheckoutCartState,
  CheckoutLocations,
  WcCheckoutSettings,
} from "@/types/checkout.types";
import { CardBrandIcon, CardBrandRow } from "@/components/shared_Ui/CardBrandIcon";
import { notifyError, notifySuccess } from "@/utils/notifications";
import { decodeHtmlEntities } from "@/utils/text.utils";

const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

const STRIPE_ELEMENT_STYLE = {
  style: {
    base: {
      fontSize: "16px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#1d2327",
      "::placeholder": { color: "#b0b0b0" },
    },
    invalid: {
      color: "#b81c23",
    },
  },
};

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

/** Saved Stripe card offered at checkout (WC Stripe "saved payment methods"). */
interface SavedCheckoutCard {
  id: string;           // WC payment token integer ID — passed as wc-stripe-payment-token
  stripe_pm_id: string; // Stripe PM ID — not used at checkout, here for type completeness
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default?: boolean; // WC default token — preselected at checkout
}

/** Sentinel for the "Use a new payment method" option. */
const NEW_CARD_ID = "new";

function saved_card_label(card: SavedCheckoutCard): string {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  const brand = brands[card.brand.toLowerCase()] ?? card.brand;
  const exp = `${String(card.exp_month).padStart(2, "0")}/${String(card.exp_year).slice(-2)}`;

  return `${brand} ending in ${card.last4} (expires ${exp})`;
}

/** WC block checkout shows "Free" for zero-cost shipping rates. */
function isFreeRate(formattedPrice: string): boolean {
  const numeric = formattedPrice.replace(/[^\d.]/g, "");
  return numeric !== "" && parseFloat(numeric) === 0;
}

function AddressSelectField({
  label,
  name,
  value,
  options,
  onChange,
  required = false,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  name: keyof CheckoutAddress;
  value: string;
  options: Array<{ code: string; name: string }>;
  onChange: (name: keyof CheckoutAddress, value: string) => void;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-near-black">
        {label}
        {/* WC block standard: required is the default, optional is marked */}
        {!required ? <span className="font-normal text-dark-gray"> (optional)</span> : null}
      </span>
      <select
        name={name}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(name, event.target.value)}
        className={`${INPUT_CLASS} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%2350575e%22 stroke-width=%222%22 fill=%22none%22/></svg>')] bg-[position:right_16px_center] bg-no-repeat pr-10 ${error ? "border-red-400" : ""}`}
      >
        <option value="">{placeholder ?? `Select ${label.toLowerCase()}...`}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {decodeHtmlEntities(option.name)}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
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
  error,
}: {
  label: string;
  name: keyof CheckoutAddress;
  value: string;
  onChange: (name: keyof CheckoutAddress, value: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-near-black">
        {label}
        {/* WC block standard: required is the default, optional is marked */}
        {!required ? <span className="font-normal text-dark-gray"> (optional)</span> : null}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(name, event.target.value)}
        className={`${INPUT_CLASS} ${error ? "border-red-400" : ""}`}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function OrderSummary({
  cart,
  checkout,
  onRemoveCoupon,
  onCertToggle,
  certOptedIn,
  isBusy,
  isUpdating,
}: {
  cart: CartData;
  checkout: CheckoutCartState;
  onRemoveCoupon: (code: string) => void;
  onCertToggle: (cartItemKey: string) => void;
  certOptedIn: Set<string>;
  isBusy: boolean;
  isUpdating: boolean;
}) {
  const regularItems = cart.items;

  return (
    <aside className="h-fit border border-light-gray bg-off-white p-6">
      <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
        Order Summary
      </h2>

      <ul className="mb-5 space-y-3 border-b border-light-gray pb-5">
        {regularItems.map((item) => {
          const hasCert = Boolean(item.has_certificate);
          const certChecked = certOptedIn.has(item.key);

          return (
            <li key={item.key} className="flex flex-col gap-1.5 text-link">
              <div className="flex items-start justify-between gap-4">
                <span className="min-w-0">
                  <span className="block font-semibold text-near-black">
                    {item.sku || item.name}
                  </span>
                  <span className="text-dark-gray">Qty: {item.quantity}</span>
                </span>
                <span className="whitespace-nowrap text-near-black">
                  {item.price_html}
                </span>
              </div>

              {hasCert ? (
                <div className="flex items-center justify-between gap-2 rounded border border-light-gray bg-white px-3 py-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-dark-gray">
                    <input
                      type="checkbox"
                      checked={certChecked}
                      disabled={isBusy}
                      onChange={() => onCertToggle(item.key)}
                      className="size-3.5 shrink-0 accent-amber"
                    />
                    <ShieldCheck className="size-3.5 shrink-0 text-amber" aria-hidden="true" />
                    Add certification
                  </label>
                  <span className={certChecked ? "font-semibold text-near-black" : "text-dark-gray"}>
                    {certChecked ? "FREE" : "Free"}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {isUpdating ? (
        <div className="space-y-3" aria-busy="true" aria-label="Updating totals">
          <div className="flex items-center gap-2 text-sm text-dark-gray">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Calculating shipping &amp; tax…
          </div>
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
          <div className="border-t border-light-gray pt-3">
            <SkeletonBlock className="h-5 w-full" />
          </div>
        </div>
      ) : (
        <dl className="space-y-2 text-link">
          <div className="flex justify-between">
            <dt className="text-dark-gray">Subtotal</dt>
            <dd className="text-near-black">{checkout.totals.subtotal}</dd>
          </div>
          {checkout.coupons.map((coupon) => (
            <div key={coupon.code} className="flex justify-between">
              <dt className="text-dark-gray">
                Coupon: <span className="uppercase">{coupon.code}</span>{" "}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemoveCoupon(coupon.code)}
                  className="text-blue underline underline-offset-2 transition-colors hover:text-amber disabled:opacity-50"
                >
                  [Remove]
                </button>
              </dt>
              <dd className="text-near-black">-{coupon.discount}</dd>
            </div>
          ))}
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
      )}
    </aside>
  );
}

function CheckoutForm({
  settings,
  isLoggedIn,
  onOrderComplete,
}: {
  settings: WcCheckoutSettings;
  isLoggedIn: boolean;
  onOrderComplete: () => void;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const cart = useCartStore((state) => state.cart);
  const setCart = useCartStore((state) => state.setCart);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [checkout, setCheckout] = useState<CheckoutCartState | null>(null);
  const [locations, setLocations] = useState<CheckoutLocations | null>(null);

  // WC block checkout pattern: shipping is the primary form.
  // Email lives in "Contact information"; phone belongs to each address
  // block ("Phone (optional)" next to ZIP — WC block standard).
  const [email, setEmail] = useState("");
  const [shipping, setShipping] = useState<CheckoutAddress>(EMPTY_ADDRESS);
  const [billing, setBilling] = useState<CheckoutAddress>(EMPTY_ADDRESS);
  // "Use same address for billing" — checked by default (WC block standard).
  const [sameAsBilling, setSameAsBilling] = useState(true);
  // WC block standard: apartment field is collapsed behind a
  // "+ Add apartment, suite, etc." link until opened (or it has a value).
  const [showShippingApt, setShowShippingApt] = useState(false);
  const [showBillingApt, setShowBillingApt] = useState(false);

  const [isUpdatingRates, setIsUpdatingRates] = useState(false);
  const [pendingRateId, setPendingRateId] = useState<string | null>(null);
  const [showAllRates, setShowAllRates] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  // Cart item keys the customer opted into receiving certification for.
  // Pure local state — sent as extensions.mmf_cert.cert_opted_in on place_order.
  const [certOptedIn, setCertOptedIn] = useState<Set<string>>(new Set());
  const [cardBrand, setCardBrand] = useState("unknown");
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const [cardNumberError, setCardNumberError] = useState("");
  const [cardExpiryError, setCardExpiryError] = useState("");
  const [cardCvcError, setCardCvcError] = useState("");
  const [cardNumberFocused, setCardNumberFocused] = useState(false);
  const [cardExpiryFocused, setCardExpiryFocused] = useState(false);
  const [cardCvcFocused, setCardCvcFocused] = useState(false);
  const cardExpiryRef = useRef<StripeCardExpiryElement | null>(null);
  const cardCvcRef = useRef<StripeCardCvcElement | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("stripe");
  // WC Stripe "Enable saved payment methods": returning customers pay with a
  // card stored at Stripe; new cards can be saved for future purchases.
  const [savedCards, setSavedCards] = useState<SavedCheckoutCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>(NEW_CARD_ID);
  const [saveNewCard, setSaveNewCard] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [showOrderNotes, setShowOrderNotes] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Order placed successfully — hold a stable "redirecting" view while the
  // client-side navigation to /checkout/success completes (clearing the cart
  // before navigation would otherwise flash the empty-cart/error screen).
  const [orderComplete, setOrderComplete] = useState(false);

  const { fields } = settings;

  const applyState = useCallback(
    (data: CheckoutStateResponse) => {
      setCheckout(data.checkout);
      setCart(data.cart);
    },
    [setCart]
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      const [stateResult, locationsResult] = await Promise.all([
        fetch_checkout_state(),
        fetch_checkout_locations(),
      ]);

      if (!active) return;

      if (locationsResult) {
        setLocations(locationsResult);

        if (locationsResult.default_country) {
          const def = locationsResult.default_country;
          setShipping((c) => (c.country ? c : { ...c, country: def }));
          setBilling((c) => (c.country ? c : { ...c, country: def }));
        }
      }

      const { ok, data } = stateResult;

      if (ok && "cart" in data) {
        applyState(data);

        // WC standard: prefill from the customer session — logged-in users
        // get their saved account addresses, returning guests get what they
        // entered earlier. Email lives on billing per Store API.
        const savedShipping = data.checkout.shipping_address ?? {};
        const savedBilling = data.checkout.billing_address ?? {};

        // Strip email (Contact section state) and empty values so a blank
        // saved country can't wipe the store default.
        const addressOnly = (a: Partial<CheckoutAddress>): Partial<CheckoutAddress> =>
          Object.fromEntries(
            Object.entries(a).filter(([k, v]) => v && k !== "email")
          ) as Partial<CheckoutAddress>;

        const savedEmail = savedBilling.email || savedShipping.email;
        if (savedEmail) setEmail(savedEmail);

        // WC falls back to the billing address when no shipping is saved.
        const shippingSource = savedShipping.address_1 ? savedShipping : savedBilling;
        if (shippingSource.address_1) {
          setShipping((c) => ({ ...c, ...addressOnly(shippingSource) }));
          if (shippingSource.address_2) setShowShippingApt(true);
        }
        if (savedBilling.address_1) {
          setBilling((c) => ({ ...c, ...addressOnly(savedBilling) }));
          if (savedBilling.address_2) setShowBillingApt(true);
        }
      } else {
        // Diagnostic trail: status 0 = client-side network error/timeout
        // (never reached the proxy); anything else is the proxy's status.
        console.error(
          `[checkout] state load failed: status=${stateResult.status}`,
          "message" in data ? data.message : "(no message)"
        );
        setLoadError(
          "message" in data && data.message
            ? data.message
            : `Could not load checkout (code ${stateResult.status}). Please refresh and try again.`
        );
      }

      setIsLoading(false);
    })();

    return () => { active = false; };
  }, [applyState]);

  // WC Stripe "Enable saved payment methods": load the customer's cards
  // stored at Stripe. Guests and disabled setting → new-card entry only.
  useEffect(() => {
    if (!isLoggedIn || !settings.saved_cards) return;

    let active = true;

    void (async () => {
      try {
        const res = await fetch(API_ROUTES.account.paymentMethods, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { payment_methods?: SavedCheckoutCard[] };
        const cards = data.payment_methods ?? [];
        if (!active || cards.length === 0) return;
        setSavedCards(cards);
        // WC standard: the customer's DEFAULT token is preselected at
        // checkout; fall back to the first card when none is marked default.
        const defaultCard = cards.find((card) => card.is_default) ?? cards[0];
        setSelectedCardId(defaultCard.id);
      } catch {
        // Card list is a convenience — checkout works without it.
      }
    })();

    return () => { active = false; };
  }, [isLoggedIn, settings.saved_cards]);

  const handleShippingChange = (name: keyof CheckoutAddress, value: string) => {
    setFormErrors((prev) => ({ ...prev, [`shipping_${name}`]: "" }));
    setShipping((c) =>
      name === "country" && value !== c.country
        ? { ...c, country: value, state: "" }
        : { ...c, [name]: value }
    );
  };

  const handleBillingChange = (name: keyof CheckoutAddress, value: string) => {
    setFormErrors((prev) => ({ ...prev, [`billing_${name}`]: "" }));
    setBilling((c) =>
      name === "country" && value !== c.country
        ? { ...c, country: value, state: "" }
        : { ...c, [name]: value }
    );
  };

  // WC → "Shipping location(s)" may differ from selling locations.
  const shippingCountries = locations?.shipping_countries ?? locations?.countries ?? [];
  const shippingStates =
    locations?.shipping_states?.[shipping.country] ??
    locations?.states?.[shipping.country] ??
    [];
  const hasShippingStates = shippingStates.length > 0;

  const billingCountries = locations?.countries ?? [];
  const billingStates = locations?.states?.[billing.country] ?? [];
  const hasBillingStates = billingStates.length > 0;

  // Effective addresses sent to WooCommerce.
  // Email from the Contact section is merged into both addresses.
  const effectiveShipping: CheckoutAddress = { ...shipping, email };
  const effectiveBilling: CheckoutAddress = sameAsBilling
    ? { ...shipping, email }
    : { ...billing, email };

  // WC standard: shipping rates + tax (TaxJar) recalculate as soon as the
  // shipping LOCATION is known — country/state/city/ZIP. Names, email, and
  // street are not required for calculation (they're validated at Place Order).
  const locationReady = useMemo(
    () =>
      Boolean(
        shipping.country && shipping.state && shipping.city && shipping.postcode
      ),
    [shipping.country, shipping.state, shipping.city, shipping.postcode]
  );

  const refreshRates = useCallback(async () => {
    if (!locationReady) return;
    setIsUpdatingRates(true);
    const { ok, data } = await update_checkout_address({
      shipping_address: effectiveShipping,
      billing_address: effectiveBilling,
    });
    if (ok && "cart" in data) applyState(data);
    else if ("message" in data && data.message) notifyError(data.message);
    setIsUpdatingRates(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationReady, shipping, billing, email, sameAsBilling, applyState]);

  // WC uses only city/state/postcode/country for rate and tax calculation —
  // address_1 changes never affect rates, so omit it to avoid extra round-trips.
  const addressKey = useMemo(
    () =>
      [
        shipping.city,
        shipping.state,
        shipping.postcode,
        shipping.country,
        sameAsBilling ? "same" : [billing.city, billing.state, billing.postcode, billing.country].join(","),
      ].join("|"),
    [shipping, billing, sameAsBilling]
  );

  useEffect(() => {
    if (!locationReady || isLoading) return;
    const id = window.setTimeout(() => { void refreshRates(); }, 800);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressKey, locationReady, isLoading]);

  // When cart total changes from a header mutation, re-fetch checkout state
  // so Order Summary Subtotal/Shipping/Tax/Total stay in sync.
  useEffect(() => {
    if (
      !cart ||
      !checkout ||
      isLoading ||
      isUpdatingRates ||
      isApplyingCoupon ||
      isPlacingOrder ||
      cart.total === checkout.totals.total
    ) return;

    let cancelled = false;
    void (async () => {
      const { ok, data } = await fetch_checkout_state();
      if (!cancelled && ok && 'cart' in data) applyState(data as CheckoutStateResponse);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.total]);

  const handleSelectRate = async (package_id: number | string, rate_id: string) => {
    setPendingRateId(rate_id);
    setIsUpdatingRates(true);
    const { ok, data } = await select_shipping_rate({ package_id, rate_id });
    if (ok && "cart" in data) applyState(data);
    else if ("message" in data && data.message) notifyError(data.message);
    setIsUpdatingRates(false);
    setPendingRateId(null);
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) { setCouponError("Please enter a coupon code."); return; }
    setCouponError("");
    setIsApplyingCoupon(true);
    const { ok, data } = await apply_coupon(code);
    if (ok && "cart" in data) {
      applyState(data); setCouponCode(""); setCouponOpen(false); notifySuccess("Coupon applied.");
    } else {
      setCouponError(("message" in data && data.message) || "Coupon code is invalid.");
    }
    setIsApplyingCoupon(false);
  };

  const handleRemoveCoupon = async (code: string) => {
    setIsApplyingCoupon(true);
    const { ok, data } = await remove_coupon(code);
    if (ok && "cart" in data) { applyState(data); notifySuccess("Coupon removed."); }
    else notifyError(("message" in data && data.message) || "Coupon could not be removed.");
    setIsApplyingCoupon(false);
  };

  const availableGateways = useMemo(() => {
    const methods = checkout?.payment_methods ?? [];
    return methods.length > 0 ? methods : ["stripe"];
  }, [checkout?.payment_methods]);

  const activeGateway = availableGateways.includes(selectedGateway)
    ? selectedGateway
    : availableGateways[0];
  const isNet30 = activeGateway === "cod";
  const usingSavedCard = savedCards.some((card) => card.id === selectedCardId);

  const checkoutError = (message: string) => {
    notifyError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "Email address is a required field.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!shipping.first_name.trim()) errors.shipping_first_name = "First name is a required field.";
    if (!shipping.last_name.trim()) errors.shipping_last_name = "Last name is a required field.";
    if (!shipping.address_1.trim()) errors.shipping_address_1 = "Address is a required field.";
    if (!shipping.city.trim()) errors.shipping_city = "City is a required field.";
    if (!shipping.state.trim()) errors.shipping_state = "State is a required field.";
    if (!shipping.postcode.trim()) errors.shipping_postcode = "ZIP Code is a required field.";
    if (!shipping.country.trim()) errors.shipping_country = "Country is a required field.";
    if (fields.company === "required" && !shipping.company?.trim()) errors.shipping_company = "Company name is a required field.";
    if (fields.phone !== "hidden") {
      const sp = shipping.phone?.trim() ?? "";
      if (fields.phone === "required" && !sp) {
        errors.shipping_phone = "Phone is a required field.";
      } else if (sp && !/^[\d\s\-+().]{7,20}$/.test(sp)) {
        errors.shipping_phone = "Please enter a valid phone number.";
      }
    }

    if (!sameAsBilling) {
      if (!billing.first_name.trim()) errors.billing_first_name = "First name is a required field.";
      if (!billing.last_name.trim()) errors.billing_last_name = "Last name is a required field.";
      if (!billing.address_1.trim()) errors.billing_address_1 = "Address is a required field.";
      if (!billing.city.trim()) errors.billing_city = "City is a required field.";
      if (!billing.state.trim()) errors.billing_state = "State is a required field.";
      if (!billing.postcode.trim()) errors.billing_postcode = "ZIP Code is a required field.";
      if (!billing.country.trim()) errors.billing_country = "Country is a required field.";
      if (fields.company === "required" && !billing.company?.trim()) errors.billing_company = "Company name is a required field.";
      if (fields.phone !== "hidden") {
        const bp = billing.phone?.trim() ?? "";
        if (fields.phone === "required" && !bp) {
          errors.billing_phone = "Phone is a required field.";
        } else if (bp && !/^[\d\s\-+().]{7,20}$/.test(bp)) {
          errors.billing_phone = "Please enter a valid phone number.";
        }
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      checkoutError("Please fill in all required checkout fields.");
      return false;
    }
    return true;
  };

  const handleCertToggle = (cartItemKey: string) => {
    setCertOptedIn((prev) => {
      const next = new Set(prev);
      if (next.has(cartItemKey)) {
        next.delete(cartItemKey);
      } else {
        next.add(cartItemKey);
      }
      return next;
    });
  };

  const handlePlaceOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    // WC standard: an order that needs shipping cannot be placed without a
    // selected shipping option.
    if (
      checkout?.needs_shipping &&
      !checkout.shipping_packages.some((pkg) =>
        pkg.shipping_rates.some((rate) => rate.selected)
      )
    ) {
      checkoutError("Please select a shipping option before placing your order.");
      return;
    }
    setIsPlacingOrder(true);

    try {
      // WC Stripe 10.x (verified against 10.8.3 source): deferred intent is the ONLY
      // code path — the wc-stripe-is-deferred-intent flag was removed in 10.5.0.
      //
      // BOTH paths require payment_method: "stripe" INSIDE payment_data. The Store API
      // copies only payment_data entries into $_POST (never the top-level field), and
      // the gateway reads $_POST['payment_method'] in two places:
      //   - get_selected_payment_method_type_from_request(): missing → type "" instead
      //     of "card" → PI creation fails ("Unable to process this payment…")
      //   - get_token_from_request(): builds "wc-{payment_method}-payment-token" —
      //     missing → "wc--payment-token" → "The selected payment method isn't valid."
      //
      //   New card:   stripe.createPaymentMethod() client-side → pm_xxx, sent as
      //               wc-stripe-payment-method. WC creates + confirms the PI server-side;
      //               a PI secret appears in redirect_url only when 3DS is required.
      //   Saved card: wc-stripe-payment-token: <WC token integer ID>.
      //   Either path: stripe.confirmCardPayment(secret, { return_url }) completes 3DS.

      let paymentData: { key: string; value: string }[] = [];
      let cardNumberElement: StripeCardNumberElement | null = null;
      // Card identity for the order-received page ("Visa ending in 4242" —
      // WC standard shows the card, not the gateway name).
      let cardBrand = "";
      let cardLast4 = "";
      let billingDetails: {
        name?: string; email?: string; phone?: string;
        address?: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string };
      } | null = null;

      if (!isNet30) {
        if (!stripe || !elements) {
          checkoutError("Payment system is still loading — try again in a moment.");
          return;
        }

        if (usingSavedCard) {
          // Saved token: WC token integer ID + payment_method (required inside
          // payment_data — see block comment above). Matches the payload the
          // official WC Blocks saved-token handler sends.
          paymentData = [
            { key: "payment_method", value: "stripe" },
            { key: "wc-stripe-payment-token", value: selectedCardId },
            { key: "isSavedToken", value: "true" },
          ];

          const savedCard = savedCards.find((card) => card.id === selectedCardId);
          cardBrand = savedCard?.brand ?? "";
          cardLast4 = savedCard?.last4 ?? "";
        } else {
          let cardValid = true;
          if (!cardNumberComplete) { setCardNumberError("Enter your card number."); cardValid = false; }
          if (!cardExpiryComplete) { setCardExpiryError("Enter the expiration date."); cardValid = false; }
          if (!cardCvcComplete) { setCardCvcError("Enter the security code."); cardValid = false; }
          if (!cardValid) { setIsPlacingOrder(false); return; }

          cardNumberElement = elements.getElement(CardNumberElement) as StripeCardNumberElement | null;
          if (!cardNumberElement) { checkoutError("Card details are required."); return; }

          const billingAddr = effectiveBilling;
          billingDetails = {
            name: `${billingAddr.first_name} ${billingAddr.last_name}`.trim(),
            email,
            phone: billingAddr.phone || undefined,
            address: {
              line1: billingAddr.address_1,
              line2: billingAddr.address_2 || undefined,
              city: billingAddr.city,
              state: billingAddr.state,
              postal_code: billingAddr.postcode,
              country: billingAddr.country,
            },
          };

          // Create the Stripe PaymentMethod client-side BEFORE the order POST —
          // the deferred-intent server flow requires an existing PM to confirm with.
          const { paymentMethod: stripePm, error: pmError } = await stripe.createPaymentMethod({
            type: "card",
            card: cardNumberElement,
            billing_details: billingDetails,
          });

          if (pmError || !stripePm) {
            checkoutError(pmError?.message || "Card could not be processed — check your details.");
            setIsPlacingOrder(false);
            return;
          }

          paymentData = [
            { key: "payment_method", value: "stripe" },
            { key: "wc-stripe-payment-method", value: stripePm.id },
            ...(isLoggedIn && settings.saved_cards && saveNewCard
              ? [{ key: "wc-stripe-new-payment-method", value: "1" }]
              : []),
          ];

          cardBrand = stripePm.card?.brand ?? "";
          cardLast4 = stripePm.card?.last4 ?? "";
        }
      }

      const certOptedInMap = certOptedIn.size > 0
        ? Object.fromEntries([...certOptedIn].map((k) => [k, true]))
        : undefined;

      const { ok, data } = await place_order({
        billing_address: effectiveBilling,
        shipping_address: effectiveShipping,
        payment_method: isNet30 ? "cod" : "stripe",
        payment_data: paymentData,
        customer_note: orderNote.trim(),
        create_account: settings.signup_enabled && !isLoggedIn && createAccount,
        cert_opted_in: certOptedInMap,
      });

      if (!ok || !("order_id" in data)) {
        checkoutError(data.message || "Order could not be placed.");
        return;
      }

      const paymentResult = data.payment_result;
      const paymentStatus = paymentResult?.payment_status;
      const redirectUrl = paymentResult?.redirect_url ?? "";

      // WC Stripe embeds the PI/SI client secret in redirect_url when the
      // payment needs client action (3DS). Formats vary by plugin version:
      //   #confirm-pi:{secret}:{encoded-verify-url}
      //   #wc-stripe-confirm-pi:{order_id}:{secret}:{nonce}
      const secretMatch = redirectUrl.match(/((pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+)/);

      if (secretMatch && stripe && !isNet30) {
        const secret = secretMatch[1];
        // The PM is already attached to the PI server-side (deferred intent).
        // confirmCardPayment runs the 3DS challenge; return_url is required
        // for redirect-based 3DS (common for EU cards).
        const confirmResult = await stripe.confirmCardPayment(secret, {
          return_url: `${window.location.origin}/checkout`,
        });

        if (confirmResult.error) {
          checkoutError(confirmResult.error.message || "Card authentication failed.");
          return;
        }

        // Classic WC redirects to wc_stripe_verify_intent after 3DS so the
        // order is marked paid immediately. Replicate that server-side —
        // non-fatal: the Stripe webhook is the fallback if this misses.
        await verify_payment_intent({
          redirect_url: redirectUrl,
          order_id: Number(data.order_id),
        });
      } else if (!isNet30 && paymentStatus !== "success" && paymentStatus !== "pending") {
        checkoutError(data.message || "Payment failed — please try another card.");
        return;
      }

      // Lock the UI into the "redirecting" state BEFORE clearing the cart —
      // otherwise the null-cart guard renders the error/empty screen for a
      // frame while router.push is still in flight.
      setOrderComplete(true);
      onOrderComplete();

      const successParams = new URLSearchParams({
        order_id: String(data.order_id),
        total: checkout?.totals.total ?? "",
        method: isNet30 ? "net30" : "card",
        ...(cardBrand ? { card_brand: cardBrand } : {}),
        ...(cardLast4 ? { card_last4: cardLast4 } : {}),
      });

      router.push(`/checkout/success?${successParams.toString()}`);
      setCart(null);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (orderComplete) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-24 text-center"
        aria-busy="true"
        role="status"
      >
        <Loader2 className="size-8 animate-spin text-amber" aria-hidden="true" />
        <p className="text-body font-semibold text-near-black">
          Order received — taking you to your confirmation&hellip;
        </p>
      </div>
    );
  }

  if (isLoading) {
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

  if (loadError || cart === null || checkout === null) {
    return (
      <div className="border-l-4 border-red-500 bg-red-50 px-5 py-4 text-link text-red-800">
        <p className="font-semibold">Checkout unavailable</p>
        <p className="mt-1 text-near-black">
          {loadError || "Could not load checkout. Please refresh and try again."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 inline-flex items-center bg-amber px-5 py-2 text-sm font-semibold uppercase text-white transition-colors hover:bg-blue"
        >
          Refresh page
        </button>
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
    <>
      {settings.login_reminder && !isLoggedIn ? (
        <p className="mb-4 max-w-[805px] border-l-4 border-blue bg-[#eef6fb] px-4 py-3 text-link text-black sm:px-5">
          Returning customer?{" "}
          <Link
            href="/login?redirect=/checkout"
            className="font-semibold text-blue underline underline-offset-2 transition-colors hover:text-amber"
          >
            Click here to login
          </Link>
        </p>
      ) : null}

      {settings.coupons_enabled ? (
        <div className="mb-6 max-w-[805px] border-l-4 border-amber bg-[#eef6fb] px-4 py-3 text-link text-black sm:px-5">
          <p className="mb-0">
            Have a coupon?{" "}
            <button
              type="button"
              onClick={() => { setCouponOpen((o) => !o); setCouponError(""); }}
              className="font-semibold text-blue underline underline-offset-2 transition-colors hover:text-amber"
            >
              Click here to enter your code
            </button>
          </p>
          {couponOpen ? (
            <div className="mt-3 border-t border-[#c9dcea] pt-3">
              <div className="flex max-w-[420px] gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                  placeholder="Coupon code"
                  aria-describedby={couponError ? "coupon-error" : undefined}
                  className={`min-w-0 flex-1 border bg-white px-4 py-2.5 text-link text-near-black outline-none transition-colors focus:border-blue ${couponError ? "border-[#b81c23]" : "border-light-gray"}`}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleApplyCoupon(); } }}
                />
                <button
                  type="button"
                  disabled={isApplyingCoupon}
                  onClick={() => void handleApplyCoupon()}
                  className="shrink-0 bg-amber px-5 py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
                >
                  {isApplyingCoupon ? "Applying..." : "Apply coupon"}
                </button>
              </div>
              {couponError ? (
                <p id="coupon-error" className="mt-2 text-sm text-[#b81c23]">{couponError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={handlePlaceOrder}
        noValidate
        className="grid gap-10 lg:grid-cols-[1fr_380px]"
      >
        <div>
          {/* ── Contact information ── */}
          <section className="mb-10">
            <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
              Contact information
            </h2>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-near-black">
                Email address
              </span>
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormErrors((p) => ({ ...p, email: "" }));
                }}
                className={`${INPUT_CLASS} ${formErrors.email ? "border-red-400" : ""}`}
              />
              {formErrors.email ? <p className="mt-1 text-xs text-red-600">{formErrors.email}</p> : null}
            </label>

            {settings.signup_enabled && !isLoggedIn ? (
              <label className="mt-4 flex cursor-pointer items-center gap-3 text-link text-near-black">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="h-4 w-4 accent-amber"
                />
                Create an account?
              </label>
            ) : null}
          </section>

          {/* ── Shipping address ── */}
          <section className="mb-10">
            <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
              Shipping address
            </h2>

            {/* Country/Region — always the first field (WC block standard).
                Rendered outside the 2-col grid so it is unambiguously first
                in the DOM regardless of grid/col-span behaviour. */}
            <div className="mb-4">
              {shippingCountries.length > 0 ? (
                <AddressSelectField label="Country/Region" name="country" value={shipping.country} options={shippingCountries} onChange={handleShippingChange} required autoComplete="shipping country" error={formErrors.shipping_country} />
              ) : (
                <AddressField label="Country/Region" name="country" value={shipping.country} onChange={handleShippingChange} required autoComplete="shipping country" error={formErrors.shipping_country} />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <AddressField label="First name" name="first_name" value={shipping.first_name} onChange={handleShippingChange} required autoComplete="shipping given-name" error={formErrors.shipping_first_name} />
              <AddressField label="Last name" name="last_name" value={shipping.last_name} onChange={handleShippingChange} required autoComplete="shipping family-name" error={formErrors.shipping_last_name} />
              {fields.company !== "hidden" ? (
                <div className="sm:col-span-2">
                  <AddressField label="Company" name="company" value={shipping.company ?? ""} onChange={handleShippingChange} required={fields.company === "required"} autoComplete="shipping organization" error={formErrors.shipping_company} />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <AddressField label="Address" name="address_1" value={shipping.address_1} onChange={handleShippingChange} required autoComplete="shipping address-line1" error={formErrors.shipping_address_1} />
              </div>
              {fields.address_2 !== "hidden" ? (
                <div className="sm:col-span-2">
                  {showShippingApt || fields.address_2 === "required" ? (
                    <AddressField label="Apartment, suite, etc." name="address_2" value={shipping.address_2 ?? ""} onChange={handleShippingChange} required={fields.address_2 === "required"} autoComplete="shipping address-line2" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowShippingApt(true)}
                      className="text-sm text-blue underline-offset-2 transition-colors hover:text-amber hover:underline"
                    >
                      + Add apartment, suite, etc.
                    </button>
                  )}
                </div>
              ) : null}
              <AddressField label="City" name="city" value={shipping.city} onChange={handleShippingChange} required autoComplete="shipping address-level2" error={formErrors.shipping_city} />
              {hasShippingStates ? (
                <AddressSelectField label="State" name="state" value={shipping.state} options={shippingStates} onChange={handleShippingChange} required autoComplete="shipping address-level1" error={formErrors.shipping_state} />
              ) : (
                <AddressField label="State / Province" name="state" value={shipping.state} onChange={handleShippingChange} required autoComplete="shipping address-level1" error={formErrors.shipping_state} />
              )}
              <AddressField label="ZIP Code" name="postcode" value={shipping.postcode} onChange={handleShippingChange} required autoComplete="shipping postal-code" error={formErrors.shipping_postcode} />
              {fields.phone !== "hidden" ? (
                <AddressField label="Phone" name="phone" type="tel" value={shipping.phone ?? ""} onChange={handleShippingChange} required={fields.phone === "required"} autoComplete="shipping tel" error={formErrors.shipping_phone} />
              ) : null}
            </div>

            {/* "Use same address for billing" — WC block checkout standard */}
            <label className="mt-6 flex cursor-pointer items-center gap-3 text-link text-near-black">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => setSameAsBilling(e.target.checked)}
                className="h-4 w-4 accent-amber"
              />
              Use same address for billing
            </label>

            {/* Billing address — shown only when different */}
            {!sameAsBilling ? (
              <div className="mt-5 border-t border-light-gray pt-5">
                <h3 className="mb-4 text-body font-bold text-near-black">
                  Billing address
                </h3>
                {/* Country/Region — first field in billing too (WC block standard) */}
                <div className="mb-4">
                  {billingCountries.length > 0 ? (
                    <AddressSelectField label="Country/Region" name="country" value={billing.country} options={billingCountries} onChange={handleBillingChange} required autoComplete="billing country" error={formErrors.billing_country} />
                  ) : (
                    <AddressField label="Country/Region" name="country" value={billing.country} onChange={handleBillingChange} required autoComplete="billing country" error={formErrors.billing_country} />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <AddressField label="First name" name="first_name" value={billing.first_name} onChange={handleBillingChange} required autoComplete="billing given-name" error={formErrors.billing_first_name} />
                  <AddressField label="Last name" name="last_name" value={billing.last_name} onChange={handleBillingChange} required autoComplete="billing family-name" error={formErrors.billing_last_name} />
                  {fields.company !== "hidden" ? (
                    <div className="sm:col-span-2">
                      <AddressField label="Company" name="company" value={billing.company ?? ""} onChange={handleBillingChange} required={fields.company === "required"} autoComplete="billing organization" error={formErrors.billing_company} />
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <AddressField label="Address" name="address_1" value={billing.address_1} onChange={handleBillingChange} required autoComplete="billing address-line1" error={formErrors.billing_address_1} />
                  </div>
                  {fields.address_2 !== "hidden" ? (
                    <div className="sm:col-span-2">
                      {showBillingApt || fields.address_2 === "required" ? (
                        <AddressField label="Apartment, suite, etc." name="address_2" value={billing.address_2 ?? ""} onChange={handleBillingChange} required={fields.address_2 === "required"} autoComplete="billing address-line2" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowBillingApt(true)}
                          className="text-sm text-blue underline-offset-2 transition-colors hover:text-amber hover:underline"
                        >
                          + Add apartment, suite, etc.
                        </button>
                      )}
                    </div>
                  ) : null}
                  <AddressField label="City" name="city" value={billing.city} onChange={handleBillingChange} required autoComplete="billing address-level2" error={formErrors.billing_city} />
                  {hasBillingStates ? (
                    <AddressSelectField label="State" name="state" value={billing.state} options={billingStates} onChange={handleBillingChange} required autoComplete="billing address-level1" error={formErrors.billing_state} />
                  ) : (
                    <AddressField label="State / Province" name="state" value={billing.state} onChange={handleBillingChange} required autoComplete="billing address-level1" error={formErrors.billing_state} />
                  )}
                  <AddressField label="ZIP Code" name="postcode" value={billing.postcode} onChange={handleBillingChange} required autoComplete="billing postal-code" error={formErrors.billing_postcode} />
                  {fields.phone !== "hidden" ? (
                    <AddressField label="Phone" name="phone" type="tel" value={billing.phone ?? ""} onChange={handleBillingChange} required={fields.phone === "required"} autoComplete="billing tel" error={formErrors.billing_phone} />
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          {/* ── Shipping method — WC block standard: section always visible
              when the order needs shipping, with address-first placeholder,
              updating state, and no-options message. ── */}
          {checkout.needs_shipping ? (
            <section className="mb-10">
              <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
                Shipping options
              </h2>

              {shippingRates.some((pkg) => pkg.shipping_rates.length > 0) ? (
                shippingRates.map((pkg) => {
                  const LIMIT = 5;
                  const rates = pkg.shipping_rates;
                  const activeId = pendingRateId ?? rates.find((r) => r.selected)?.rate_id;
                  const visible = showAllRates
                    ? rates
                    : rates.filter((r, i) => i < LIMIT || r.rate_id === activeId);
                  const hiddenCount = rates.length - visible.length;

                  return (
                    <div key={pkg.package_id}>
                      <ul className="space-y-2">
                        {visible.map((rate) => (
                          <li key={rate.rate_id}>
                            <label className="flex cursor-pointer items-center justify-between gap-4 border border-light-gray bg-white px-4 py-3 transition-colors has-[:checked]:border-blue">
                              <span className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name={`shipping-${pkg.package_id}`}
                                  checked={pendingRateId !== null ? pendingRateId === rate.rate_id : rate.selected}
                                  onChange={() => void handleSelectRate(pkg.package_id, rate.rate_id)}
                                />
                                <span className="text-link text-near-black">{rate.name}</span>
                              </span>
                              <span className="text-link font-semibold text-near-black">
                                {isFreeRate(rate.price) ? "Free" : rate.price}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                      {!showAllRates && hiddenCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setShowAllRates(true)}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 border border-light-gray bg-off-white px-4 py-2.5 text-link text-dark-gray transition-colors hover:bg-white hover:text-near-black"
                        >
                          See {hiddenCount} more option{hiddenCount !== 1 ? "s" : ""}
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      ) : showAllRates && rates.length > LIMIT ? (
                        <button
                          type="button"
                          onClick={() => setShowAllRates(false)}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 border border-light-gray bg-off-white px-4 py-2.5 text-link text-dark-gray transition-colors hover:bg-white hover:text-near-black"
                        >
                          See less
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      ) : null}
                    </div>
                  );
                })
              ) : isUpdatingRates ? (
                <div className="flex items-center gap-2 border border-light-gray bg-off-white px-4 py-3 text-link text-dark-gray" aria-busy="true">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Loading shipping options…
                </div>
              ) : locationReady ? (
                <p className="border-l-4 border-amber bg-[#fdf6e7] px-4 py-3 text-link text-near-black">
                  There are no shipping options available for this address.
                  Please verify the address is correct or contact us for help.
                </p>
              ) : (
                <p className="border border-light-gray bg-off-white px-4 py-3 text-link text-dark-gray">
                  Enter your shipping address to view shipping options.
                </p>
              )}
            </section>
          ) : null}

          {/* ── Payment ── */}
          <section>
            <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
              Payment options
            </h2>

            {availableGateways.length > 1 ? (
              <ul className="mb-4 flex flex-col gap-2">
                {availableGateways.map((gateway) => (
                  <li key={gateway}>
                    <label className="flex cursor-pointer items-center gap-3 border border-light-gray bg-white px-4 py-3">
                      <input
                        type="radio"
                        name="payment_gateway"
                        value={gateway}
                        checked={activeGateway === gateway}
                        onChange={() => setSelectedGateway(gateway)}
                        className="h-4 w-4 accent-amber"
                      />
                      <span className="text-link font-semibold text-near-black">
                        {gateway === "cod" ? "Net 30 — Purchase Order Terms" : gateway === "stripe" ? "Credit Card" : gateway}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}

            {isNet30 ? (
              <p className="border border-light-gray bg-off-white p-4 text-link text-dark-gray">
                Your order will be placed on Net 30 payment terms. An invoice will
                be included with your order — payment is due within 30 days.
              </p>
            ) : (
              <div className="space-y-3">
                {/* WC Stripe "saved payment methods" — returning customers pick a
                    stored card or enter a new one. */}
                {savedCards.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {savedCards.map((card) => (
                      <li key={card.id}>
                        <label className="flex cursor-pointer items-center gap-3 border border-light-gray bg-white px-4 py-3">
                          <input
                            type="radio"
                            name="saved_payment_method"
                            value={card.id}
                            checked={selectedCardId === card.id}
                            onChange={() => setSelectedCardId(card.id)}
                            className="h-4 w-4 accent-amber"
                          />
                          <CardBrandIcon brand={card.brand} size="sm" />
                          <span className="text-link text-near-black">
                            {saved_card_label(card)}
                          </span>
                        </label>
                      </li>
                    ))}
                    <li>
                      <label className="flex cursor-pointer items-center gap-3 border border-light-gray bg-white px-4 py-3">
                        <input
                          type="radio"
                          name="saved_payment_method"
                          value={NEW_CARD_ID}
                          checked={!usingSavedCard}
                          onChange={() => setSelectedCardId(NEW_CARD_ID)}
                          className="h-4 w-4 accent-amber"
                        />
                        <span className="text-link text-near-black">
                          Use a new payment method
                        </span>
                      </label>
                    </li>
                  </ul>
                ) : null}

                {usingSavedCard ? null : (
                  <>
                    {/* WooCommerce-standard Stripe card layout — each field has
                        its own border + error message directly beneath it */}

                    {/* Card number — full width */}
                    <div>
                      <div
                        className={`border bg-white px-4 py-3 transition-colors ${
                          cardNumberError
                            ? "border-red-400"
                            : cardNumberFocused
                              ? "border-blue"
                              : "border-light-gray"
                        }`}
                      >
                        <CardNumberElement
                          options={{ ...STRIPE_ELEMENT_STYLE, showIcon: true }}
                          onFocus={() => setCardNumberFocused(true)}
                          onBlur={() => setCardNumberFocused(false)}
                          onChange={(e) => {
                            setCardBrand(e.brand ?? "unknown");
                            setCardNumberComplete(e.complete);
                            if (e.error) setCardNumberError(e.error.message);
                            else {
                              setCardNumberError("");
                              if (e.complete) cardExpiryRef.current?.focus();
                            }
                          }}
                        />
                      </div>
                      {cardNumberError ? (
                        <p className="mt-1 text-xs text-red-600">{cardNumberError}</p>
                      ) : null}
                    </div>

                    {/* Expiry + CVC — side by side, each with own error */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <div
                          className={`border bg-white px-4 py-3 transition-colors ${
                            cardExpiryError
                              ? "border-red-400"
                              : cardExpiryFocused
                                ? "border-blue"
                                : "border-light-gray"
                          }`}
                        >
                          <CardExpiryElement
                            options={STRIPE_ELEMENT_STYLE}
                            onReady={(el) => { cardExpiryRef.current = el; }}
                            onFocus={() => setCardExpiryFocused(true)}
                            onBlur={() => setCardExpiryFocused(false)}
                            onChange={(e) => {
                              setCardExpiryComplete(e.complete);
                              if (e.error) setCardExpiryError(e.error.message);
                              else {
                                setCardExpiryError("");
                                if (e.complete) cardCvcRef.current?.focus();
                              }
                            }}
                          />
                        </div>
                        {cardExpiryError ? (
                          <p className="mt-1 text-xs text-red-600">{cardExpiryError}</p>
                        ) : null}
                      </div>

                      <div className="flex-1">
                        <div
                          className={`border bg-white px-4 py-3 transition-colors ${
                            cardCvcError
                              ? "border-red-400"
                              : cardCvcFocused
                                ? "border-blue"
                                : "border-light-gray"
                          }`}
                        >
                          <CardCvcElement
                            options={STRIPE_ELEMENT_STYLE}
                            onReady={(el) => { cardCvcRef.current = el; }}
                            onFocus={() => setCardCvcFocused(true)}
                            onBlur={() => setCardCvcFocused(false)}
                            onChange={(e) => {
                              setCardCvcComplete(e.complete);
                              if (e.error) setCardCvcError(e.error.message);
                              else setCardCvcError("");
                            }}
                          />
                        </div>
                        {cardCvcError ? (
                          <p className="mt-1 text-xs text-red-600">{cardCvcError}</p>
                        ) : null}
                      </div>
                    </div>

                    <CardBrandRow detected={cardBrand} />
                  </>
                )}

                {/* WC Stripe: "Save payment information to my account for
                    future purchases." — logged-in customers, setting on. */}
                {!usingSavedCard && isLoggedIn && settings.saved_cards ? (
                  <label className="flex cursor-pointer items-center gap-3 pt-1 text-link text-near-black">
                    <input
                      type="checkbox"
                      checked={saveNewCard}
                      onChange={(e) => setSaveNewCard(e.target.checked)}
                      className="h-4 w-4 accent-amber"
                    />
                    Save payment information to my account for future purchases.
                  </label>
                ) : null}
              </div>
            )}

            {settings.order_notes_enabled !== false ? (
              <div className="mt-5 border-t border-light-gray pt-5">
                <label className="flex cursor-pointer items-center gap-3 text-link text-near-black">
                  <input
                    type="checkbox"
                    checked={showOrderNotes}
                    onChange={(e) => setShowOrderNotes(e.target.checked)}
                    className="h-4 w-4 accent-amber"
                  />
                  Add a note to your order
                </label>
                {showOrderNotes ? (
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    rows={3}
                    placeholder="Notes about your order, e.g. special delivery instructions."
                    className={`${INPUT_CLASS} mt-3 resize-y`}
                  />
                ) : null}
              </div>
            ) : null}

            {settings.terms_page_path ? (
              <p className="mt-5 border-t border-light-gray pt-5 text-sm text-dark-gray">
                By proceeding with your purchase you agree to our{" "}
                <a href={settings.terms_page_path} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue underline-offset-2 transition-colors hover:text-amber">
                  Terms and Conditions
                </a>
                {settings.privacy_page_path ? (
                  <>{" "}and{" "}<a href={settings.privacy_page_path} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue underline-offset-2 transition-colors hover:text-amber">Privacy Policy</a></>
                ) : null}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={isPlacingOrder || isUpdatingRates}
                className="inline-flex w-full items-center justify-center bg-amber px-8 py-4 text-body font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50 sm:w-auto"
              >
                {isPlacingOrder ? "Placing Order..." : `Place Order — ${checkout.totals.total}`}
              </button>
              {/* WC block checkout standard: Return to Cart link below CTA */}
              <Link
                href="/cart"
                className="text-link font-semibold text-blue underline underline-offset-2 transition-colors hover:text-amber"
              >
                Return to Cart
              </Link>
            </div>
          </section>
        </div>

        <OrderSummary
          cart={cart}
          checkout={checkout}
          onRemoveCoupon={(code) => void handleRemoveCoupon(code)}
          onCertToggle={handleCertToggle}
          certOptedIn={certOptedIn}
          isBusy={isApplyingCoupon || isPlacingOrder}
          isUpdating={isUpdatingRates}
        />
      </form>
    </>
  );
}

export default function CheckoutPageView({
  settings,
  isLoggedIn,
}: {
  settings: WcCheckoutSettings;
  isLoggedIn: boolean;
}) {
  const [orderComplete, setOrderComplete] = useState(false);

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

  if (orderComplete) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"
        aria-busy="true"
        role="status"
      >
        <Loader2 className="size-8 animate-spin text-amber" aria-hidden="true" />
        <p className="text-body font-semibold text-near-black">
          Order received — taking you to your confirmation&hellip;
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
        <CartTaxExemptionNotice isLoggedIn={isLoggedIn} />
      </div>

      <Elements stripe={stripePromise}>
        <CheckoutForm
          settings={settings}
          isLoggedIn={isLoggedIn}
          onOrderComplete={() => setOrderComplete(true)}
        />
      </Elements>
    </div>
  );
}
