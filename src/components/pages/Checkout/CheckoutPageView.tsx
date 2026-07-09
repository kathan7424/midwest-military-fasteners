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
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import CartTaxExemptionNotice from "@/components/pages/Cart/CartTaxExemptionNotice";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { useCartStore } from "@/stores/cart.store";
import {
  apply_coupon,
  fetch_checkout_locations,
  fetch_checkout_state,
  place_order,
  remove_coupon,
  select_shipping_rate,
  update_checkout_address,
  type CheckoutStateResponse,
} from "@/services/checkout.client";
import type { CartData } from "@/types/cart.types";
import type {
  CheckoutAddress,
  CheckoutCartState,
  CheckoutLocations,
  WcCheckoutSettings,
} from "@/types/checkout.types";
import { CardBrandRow } from "@/components/shared_Ui/CardBrandIcon";
import { notifyError, notifySuccess } from "@/utils/notifications";

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
        {required ? <span className="text-[#E12222]"> *</span> : null}
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
            {option.name}
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
        {required ? <span className="text-[#E12222]"> *</span> : null}
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
  isBusy,
}: {
  cart: CartData;
  checkout: CheckoutCartState;
  onRemoveCoupon: (code: string) => void;
  isBusy: boolean;
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
    </aside>
  );
}

function CheckoutForm({
  settings,
  isLoggedIn,
}: {
  settings: WcCheckoutSettings;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const setCart = useCartStore((state) => state.setCart);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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
  // WC → Accounts & Privacy → "Allow customers to create an account during
  // checkout" — Store API creates the account with the order when true.
  const [createAccount, setCreateAccount] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  // WooCommerce decides which gateways this customer sees (e.g. Net 30/cod
  // only for admin-flagged accounts) — we render whatever the cart returns.
  const [selectedGateway, setSelectedGateway] = useState("stripe");
  // Coupon form (rendered only when WC → "Enable the use of coupon codes").
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // WC checkout customizer: company / apartment / phone visibility.
  const { fields } = settings;

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
      } else {
        setLoadError(
          "message" in data && data.message
            ? data.message
            : "Could not load checkout. Please refresh and try again."
        );
      }

      setIsLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [applyState]);

  const handleAddressChange = (name: keyof CheckoutAddress, value: string) => {
    setFormErrors((prev) => ({ ...prev, [`billing_${name}`]: "" }));
    setAddress((current) => {
      if (name === "country" && value !== current.country) {
        return { ...current, country: value, state: "" };
      }
      return { ...current, [name]: value };
    });
  };

  const handleShippingChange = (name: keyof CheckoutAddress, value: string) => {
    setFormErrors((prev) => ({ ...prev, [`shipping_${name}`]: "" }));
    setShippingAddress((current) => {
      if (name === "country" && value !== current.country) {
        return { ...current, country: value, state: "" };
      }
      return { ...current, [name]: value };
    });
  };

  const countryStates = locations?.states[address.country] ?? [];
  const hasStatesList = countryStates.length > 0;
  // WC → General → "Shipping location(s)" may differ from selling locations —
  // the shipping form gets its own country/state lists (classic WC behavior).
  const shippingCountries = locations?.shipping_countries ?? locations?.countries ?? [];
  const shippingCountryStates =
    locations?.shipping_states?.[shippingAddress.country] ??
    locations?.states[shippingAddress.country] ??
    [];
  const hasShippingStatesList = shippingCountryStates.length > 0;

  // WooCommerce rule: rates + tax follow the SHIPPING address.
  const effectiveShipping = shipToDifferent ? shippingAddress : address;

  // isBilling: email + phone requirements only apply to the billing block
  // (WooCommerce standard — shipping has no email/phone fields).
  const isAddressComplete = useCallback(
    (value: CheckoutAddress, isBilling: boolean) =>
      Boolean(
        value.first_name &&
          value.last_name &&
          value.address_1 &&
          value.city &&
          value.state &&
          value.postcode &&
          value.country &&
          (fields.company !== "required" || value.company) &&
          (!isBilling || value.email) &&
          (!isBilling || fields.phone !== "required" || value.phone)
      ),
    [fields.company, fields.phone]
  );

  const addressReady = useMemo(
    () =>
      isAddressComplete(address, true) &&
      (!shipToDifferent || isAddressComplete(shippingAddress, false)),
    [address, shippingAddress, shipToDifferent, isAddressComplete]
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

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();

    if (!code) {
      notifyError("Enter a coupon code.");
      return;
    }

    setIsApplyingCoupon(true);

    const { ok, data } = await apply_coupon(code);

    if (ok && "cart" in data) {
      applyState(data);
      setCouponCode("");
      setCouponOpen(false);
      notifySuccess("Coupon applied.");
    } else {
      notifyError(("message" in data && data.message) || "Coupon could not be applied.");
    }

    setIsApplyingCoupon(false);
  };

  const handleRemoveCoupon = async (code: string) => {
    setIsApplyingCoupon(true);

    const { ok, data } = await remove_coupon(code);

    if (ok && "cart" in data) {
      applyState(data);
      notifySuccess("Coupon removed.");
    } else {
      notifyError(("message" in data && data.message) || "Coupon could not be removed.");
    }

    setIsApplyingCoupon(false);
  };

  const availableGateways = useMemo(() => {
    const methods = checkout?.payment_methods ?? [];
    return methods.length > 0 ? methods : ["stripe"];
  }, [checkout?.payment_methods]);

  // Derived, not synced: if WooCommerce stops offering the selected gateway,
  // fall back to the first available one without an effect.
  const activeGateway = availableGateways.includes(selectedGateway)
    ? selectedGateway
    : availableGateways[0];

  const isNet30 = activeGateway === "cod";

  // Show error toast AND scroll to top so user sees it above the long form.
  const checkoutError = (message: string) => {
    notifyError(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!address.first_name.trim()) errors.billing_first_name = "First name is a required field.";
    if (!address.last_name.trim()) errors.billing_last_name = "Last name is a required field.";
    if (!address.address_1.trim()) errors.billing_address_1 = "Street address is a required field.";
    if (!address.city.trim()) errors.billing_city = "City is a required field.";
    if (!address.state.trim()) errors.billing_state = "State is a required field.";
    if (!address.postcode.trim()) errors.billing_postcode = "Postcode / ZIP is a required field.";
    if (!address.country.trim()) errors.billing_country = "Country is a required field.";

    if (!address.email?.trim()) {
      errors.billing_email = "Email address is a required field.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) {
      errors.billing_email = "Please enter a valid email address.";
    }

    if (fields.company === "required" && !address.company?.trim()) {
      errors.billing_company = "Company name is a required field.";
    }
    if (fields.phone === "required" && !address.phone?.trim()) {
      errors.billing_phone = "Phone is a required field.";
    }

    if (shipToDifferent) {
      if (!shippingAddress.first_name.trim()) errors.shipping_first_name = "First name is a required field.";
      if (!shippingAddress.last_name.trim()) errors.shipping_last_name = "Last name is a required field.";
      if (!shippingAddress.address_1.trim()) errors.shipping_address_1 = "Street address is a required field.";
      if (!shippingAddress.city.trim()) errors.shipping_city = "City is a required field.";
      if (!shippingAddress.state.trim()) errors.shipping_state = "State is a required field.";
      if (!shippingAddress.postcode.trim()) errors.shipping_postcode = "Postcode / ZIP is a required field.";
      if (!shippingAddress.country.trim()) errors.shipping_country = "Country is a required field.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      checkoutError("Please fill in all required checkout fields.");
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsPlacingOrder(true);

    try {
      let paymentData: { key: string; value: string | boolean }[] = [];

      if (!isNet30) {
        if (!stripe || !elements) {
          checkoutError("Payment system is still loading — try again in a moment.");
          return;
        }

        // Validate all three card fields before calling Stripe.
        let cardValid = true;
        if (!cardNumberComplete) {
          setCardNumberError("Enter your card number.");
          cardValid = false;
        }
        if (!cardExpiryComplete) {
          setCardExpiryError("Enter the expiration date.");
          cardValid = false;
        }
        if (!cardCvcComplete) {
          setCardCvcError("Enter the security code.");
          cardValid = false;
        }
        if (!cardValid) {
          setIsPlacingOrder(false);
          return;
        }

        const cardNumberElement = elements.getElement(CardNumberElement);

        if (!cardNumberElement) {
          checkoutError("Card details are required.");
          return;
        }

        const { paymentMethod, error } = await stripe.createPaymentMethod({
          type: "card",
          card: cardNumberElement,
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
          checkoutError(error?.message || "Card could not be processed.");
          return;
        }

        // Keys required by the WooCommerce Stripe Gateway (UPE/deferred intent).
        paymentData = [
          { key: "payment_method", value: "stripe" },
          { key: "wc-stripe-payment-method", value: paymentMethod.id },
          { key: "wc-stripe-is-deferred-intent", value: true },
        ];
      }

      const { ok, data } = await place_order({
        billing_address: address,
        shipping_address: effectiveShipping,
        payment_method: isNet30 ? "cod" : "stripe",
        payment_data: paymentData,
        customer_note: orderNote.trim(),
        create_account: settings.signup_enabled && !isLoggedIn && createAccount,
      });

      if (!ok || !("order_id" in data)) {
        checkoutError(data.message || "Order could not be placed.");
        return;
      }

      const paymentResult = data.payment_result;
      const paymentStatus = paymentResult?.payment_status;
      const redirectUrl = paymentResult?.redirect_url ?? "";

      // 3D Secure: the gateway signals it via a confirm hash in redirect_url
      // (#wc-stripe-confirm-pi:<order>:<client_secret>:<nonce>).
      const secretMatch = redirectUrl.match(/confirm-pi:[^:]*:((pi|seti)_[^:#]+_secret_[^:#]+)/);

      if (secretMatch && stripe && !isNet30) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          secretMatch[1]
        );

        if (confirmError) {
          checkoutError(confirmError.message || "Card authentication failed.");
          return;
        }
      } else if (paymentStatus !== "success" && paymentStatus !== "pending") {
        checkoutError(data.message || "Payment failed — please try another card.");
        return;
      }

      setCart(null);

      const successParams = new URLSearchParams({
        order_id: String(data.order_id),
        total: checkout?.totals.total ?? "",
        email: address.email ?? "",
        method: isNet30 ? "net30" : "card",
      });

      router.push(`/checkout/success?${successParams.toString()}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

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
      {/* WC → Accounts & Privacy: "Allow customers to log into an existing
          account during checkout" — classic checkout login notice. */}
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

      {/* WC → General: "Enable the use of coupon codes". */}
      {settings.coupons_enabled ? (
        <div className="mb-6 max-w-[805px] border-l-4 border-amber bg-[#eef6fb] px-4 py-3 text-link text-black sm:px-5">
          <p className="mb-0">
            Have a coupon?{" "}
            <button
              type="button"
              onClick={() => setCouponOpen((open) => !open)}
              className="font-semibold text-blue underline underline-offset-2 transition-colors hover:text-amber"
            >
              Click here to enter your code
            </button>
          </p>

          {couponOpen ? (
            <div className="mt-3 flex max-w-[420px] gap-2 border-t border-[#c9dcea] pt-3">
              <input
                type="text"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
                placeholder="Coupon code"
                className="min-w-0 flex-1 border border-light-gray bg-white px-4 py-2.5 text-link text-near-black outline-none transition-colors focus:border-blue"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleApplyCoupon();
                  }
                }}
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
          ) : null}
        </div>
      ) : null}

    <form
      onSubmit={handlePlaceOrder}
      noValidate
      className="grid gap-10 lg:grid-cols-[1fr_380px]"
    >
      <div>
        <section className="mb-10">
          <h2 className="mb-5 text-h5 font-bold uppercase text-near-black">
            Billing details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <AddressField label="First name" name="first_name" value={address.first_name} onChange={handleAddressChange} required autoComplete="given-name" error={formErrors.billing_first_name} />
            <AddressField label="Last name" name="last_name" value={address.last_name} onChange={handleAddressChange} required autoComplete="family-name" error={formErrors.billing_last_name} />
            {fields.company !== "hidden" ? (
              <div className="sm:col-span-2">
                <AddressField label="Company" name="company" value={address.company ?? ""} onChange={handleAddressChange} required={fields.company === "required"} autoComplete="organization" error={formErrors.billing_company} />
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <AddressField label="Street address" name="address_1" value={address.address_1} onChange={handleAddressChange} required autoComplete="address-line1" error={formErrors.billing_address_1} />
            </div>
            {fields.address_2 !== "hidden" ? (
              <div className="sm:col-span-2">
                <AddressField label="Apartment, suite, etc." name="address_2" value={address.address_2 ?? ""} onChange={handleAddressChange} required={fields.address_2 === "required"} autoComplete="address-line2" />
              </div>
            ) : null}
            {locations ? (
              <AddressSelectField
                label="Country"
                name="country"
                value={address.country}
                options={locations.countries}
                onChange={handleAddressChange}
                required
                autoComplete="country"
                error={formErrors.billing_country}
              />
            ) : (
              <AddressField label="Country" name="country" value={address.country} onChange={handleAddressChange} required autoComplete="country" error={formErrors.billing_country} />
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
                error={formErrors.billing_state}
              />
            ) : (
              <AddressField label="State / Province" name="state" value={address.state} onChange={handleAddressChange} required autoComplete="address-level1" error={formErrors.billing_state} />
            )}
            <AddressField label="City" name="city" value={address.city} onChange={handleAddressChange} required autoComplete="address-level2" error={formErrors.billing_city} />
            <AddressField label="ZIP code" name="postcode" value={address.postcode} onChange={handleAddressChange} required autoComplete="postal-code" error={formErrors.billing_postcode} />
            <AddressField label="Email" name="email" type="email" value={address.email ?? ""} onChange={handleAddressChange} required autoComplete="email" error={formErrors.billing_email} />
            {fields.phone !== "hidden" ? (
              <AddressField label="Phone" name="phone" type="tel" value={address.phone ?? ""} onChange={handleAddressChange} required={fields.phone === "required"} autoComplete="tel" error={formErrors.billing_phone} />
            ) : null}
          </div>

          {/* WC → Accounts & Privacy: "Allow customers to create an account
              during checkout" — classic checkout "Create an account?" box. */}
          {settings.signup_enabled && !isLoggedIn ? (
            <label className="mt-6 flex cursor-pointer items-center gap-3 text-link text-near-black">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(event) => setCreateAccount(event.target.checked)}
                className="h-4 w-4 accent-amber"
              />
              Create an account?
            </label>
          ) : null}

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
              <AddressField label="First name" name="first_name" value={shippingAddress.first_name} onChange={handleShippingChange} required autoComplete="shipping given-name" error={formErrors.shipping_first_name} />
              <AddressField label="Last name" name="last_name" value={shippingAddress.last_name} onChange={handleShippingChange} required autoComplete="shipping family-name" error={formErrors.shipping_last_name} />
              {fields.company !== "hidden" ? (
                <div className="sm:col-span-2">
                  <AddressField label="Company" name="company" value={shippingAddress.company ?? ""} onChange={handleShippingChange} required={fields.company === "required"} autoComplete="shipping organization" />
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <AddressField label="Street address" name="address_1" value={shippingAddress.address_1} onChange={handleShippingChange} required autoComplete="shipping address-line1" error={formErrors.shipping_address_1} />
              </div>
              {fields.address_2 !== "hidden" ? (
                <div className="sm:col-span-2">
                  <AddressField label="Apartment, suite, etc." name="address_2" value={shippingAddress.address_2 ?? ""} onChange={handleShippingChange} required={fields.address_2 === "required"} autoComplete="shipping address-line2" />
                </div>
              ) : null}
              {locations ? (
                <AddressSelectField
                  label="Country"
                  name="country"
                  value={shippingAddress.country}
                  options={shippingCountries}
                  onChange={handleShippingChange}
                  required
                  autoComplete="shipping country"
                  error={formErrors.shipping_country}
                />
              ) : (
                <AddressField label="Country" name="country" value={shippingAddress.country} onChange={handleShippingChange} required autoComplete="shipping country" error={formErrors.shipping_country} />
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
                  error={formErrors.shipping_state}
                />
              ) : (
                <AddressField label="State / Province" name="state" value={shippingAddress.state} onChange={handleShippingChange} required autoComplete="shipping address-level1" error={formErrors.shipping_state} />
              )}
              <AddressField label="City" name="city" value={shippingAddress.city} onChange={handleShippingChange} required autoComplete="shipping address-level2" error={formErrors.shipping_city} />
              <AddressField label="ZIP code" name="postcode" value={shippingAddress.postcode} onChange={handleShippingChange} required autoComplete="shipping postal-code" error={formErrors.shipping_postcode} />
            </div>
          ) : null}

          {isUpdatingRates ? (
            <p className="mt-4 text-link text-dark-gray" role="status">
              Updating shipping &amp; tax for your address...
            </p>
          ) : null}

          {settings.order_notes_enabled !== false ? (
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
          ) : null}
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

          {/* Gateways come from WooCommerce per customer — Net 30 (cod) only
              appears for admin-flagged accounts. */}
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
                      {gateway === "cod"
                        ? "Net 30 — Purchase Order Terms"
                        : gateway === "stripe"
                          ? "Credit Card"
                          : gateway}
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
            <div className="space-y-4">
              {/* Card number */}
              <div>
                <span className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-near-black">
                    Card number <span className="text-[#E12222]">*</span>
                  </span>
                  <CardBrandRow detected={cardBrand} />
                </span>
                <div
                  className={`border bg-white px-4 py-3 transition-colors ${
                    cardNumberFocused
                      ? "border-blue"
                      : cardNumberError
                        ? "border-red-400"
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
                      else if (e.complete) setCardNumberError("");
                    }}
                  />
                </div>
                {cardNumberError ? (
                  <p className="mt-1 text-xs text-red-600">{cardNumberError}</p>
                ) : null}
              </div>

              {/* Expiry + CVC side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-near-black">
                    Expiration date <span className="text-[#E12222]">*</span>
                  </span>
                  <div
                    className={`border bg-white px-4 py-3 transition-colors ${
                      cardExpiryFocused
                        ? "border-blue"
                        : cardExpiryError
                          ? "border-red-400"
                          : "border-light-gray"
                    }`}
                  >
                    <CardExpiryElement
                      options={STRIPE_ELEMENT_STYLE}
                      onFocus={() => setCardExpiryFocused(true)}
                      onBlur={() => setCardExpiryFocused(false)}
                      onChange={(e) => {
                        setCardExpiryComplete(e.complete);
                        if (e.error) setCardExpiryError(e.error.message);
                        else if (e.complete) setCardExpiryError("");
                      }}
                    />
                  </div>
                  {cardExpiryError ? (
                    <p className="mt-1 text-xs text-red-600">{cardExpiryError}</p>
                  ) : null}
                </div>

                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-near-black">
                    Security code <span className="text-[#E12222]">*</span>
                  </span>
                  <div
                    className={`border bg-white px-4 py-3 transition-colors ${
                      cardCvcFocused
                        ? "border-blue"
                        : cardCvcError
                          ? "border-red-400"
                          : "border-light-gray"
                    }`}
                  >
                    <CardCvcElement
                      options={STRIPE_ELEMENT_STYLE}
                      onFocus={() => setCardCvcFocused(true)}
                      onBlur={() => setCardCvcFocused(false)}
                      onChange={(e) => {
                        setCardCvcComplete(e.complete);
                        if (e.error) setCardCvcError(e.error.message);
                        else if (e.complete) setCardCvcError("");
                      }}
                    />
                  </div>
                  {cardCvcError ? (
                    <p className="mt-1 text-xs text-red-600">{cardCvcError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isPlacingOrder}
            className="mt-6 inline-flex w-full items-center justify-center bg-amber px-8 py-4 text-body font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50 sm:w-auto"
          >
            {isPlacingOrder ? "Placing Order..." : `Place Order — ${checkout.totals.total}`}
          </button>
        </section>
      </div>

      <OrderSummary
        cart={cart}
        checkout={checkout}
        onRemoveCoupon={(code) => void handleRemoveCoupon(code)}
        isBusy={isApplyingCoupon || isPlacingOrder}
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
        <CheckoutForm settings={settings} isLoggedIn={isLoggedIn} />
      </Elements>
    </div>
  );
}
