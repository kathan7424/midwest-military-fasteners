/**
 * File Name: PaymentMethodsPanel.tsx
 * Description: My Account → Payment Methods — lists saved Stripe cards,
 *   lets the user add a new card via SetupIntent, and delete existing ones.
 *   Matches WooCommerce Stripe "My Payment Methods" UX.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeCardExpiryElement, StripeCardCvcElement } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Trash2, Plus, Star, X } from "lucide-react";

import { CardBrandIcon } from "@/components/shared_Ui/CardBrandIcon";
import { LABEL_CLASS } from "@/components/shared_Ui/form-styles";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { notifyError, notifySuccess } from "@/utils/notifications";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface SavedCard {
  id: string;           // WC payment token integer ID — used for checkout + default
  stripe_pm_id: string; // Stripe PM ID — used only for the delete URL
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default?: boolean; // WC-standard default token — preselected at checkout
}

/* ------------------------------------------------------------------ */
/* Stripe setup                                                          */
/* ------------------------------------------------------------------ */

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const ELEMENT_STYLE = {
  style: {
    base: {
      fontSize: "14px",
      color: "#1a1a1a",
      fontFamily: "inherit",
      "::placeholder": { color: "#6b7280" },
    },
    invalid: { color: "#b91c1c" },
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function brand_label(brand: string): string {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return map[brand.toLowerCase()] ?? brand;
}

function exp_label(month: number, year: number): string {
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                             */
/* ------------------------------------------------------------------ */

function PaymentSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-4 border border-light-gray bg-white p-4">
          <SkeletonBlock className="size-9 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
          <SkeletonBlock className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add-card form (inside Elements context)                             */
/* ------------------------------------------------------------------ */

function AddCardForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  /** Receives the confirmed Stripe PM id so the panel can register the WC token. */
  onSuccess: (pmId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cardName, setCardName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [numberError, setNumberError] = useState("");
  const [expiryError, setExpiryError] = useState("");
  const [cvcError, setCvcError] = useState("");
  const [numberComplete, setNumberComplete] = useState(false);
  const [expiryComplete, setExpiryComplete] = useState(false);
  const [cvcComplete, setCvcComplete] = useState(false);
  const [numberFocused, setNumberFocused] = useState(false);
  const [expiryFocused, setExpiryFocused] = useState(false);
  const [cvcFocused, setCvcFocused] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const expiryRef = useRef<StripeCardExpiryElement | null>(null);
  const cvcRef = useRef<StripeCardCvcElement | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    let valid = true;
    if (!cardName.trim()) { setNameError("Enter the name on your card."); valid = false; }
    if (!numberComplete) { setNumberError("Enter your card number."); valid = false; }
    if (!expiryComplete) { setExpiryError("Enter the expiration date."); valid = false; }
    if (!cvcComplete) { setCvcError("Enter the security code."); valid = false; }
    if (!valid) return;

    setIsSubmitting(true);

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setNumberError("Card form not ready. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // billing_details.name is required by many card networks and is standard
    // in all WC Stripe "Add Payment Method" flows. Without it Stripe stores
    // the card with no name, which causes AVS failures with some US issuers.
    const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: { name: cardName.trim() },
      },
      return_url: window.location.href,
    });

    if (error) {
      const param = error.param ?? "";
      if (param.includes("exp_month") || param.includes("exp_year") || error.code?.startsWith("invalid_expiry")) {
        setExpiryError(error.message ?? "Invalid expiry date.");
      } else if (param.includes("cvc") || error.code?.startsWith("invalid_cvc")) {
        setCvcError(error.message ?? "Invalid security code.");
      } else {
        setNumberError(error.message ?? "Failed to save card. Please try again.");
      }
      setIsSubmitting(false);
      return;
    }

    // setupIntent.payment_method is the attached PM id (string in card flows).
    const pmId =
      typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent?.payment_method?.id ?? "";

    if (!pmId) {
      setNumberError("Card was saved at Stripe but could not be registered — please refresh.");
      setIsSubmitting(false);
      return;
    }

    onSuccess(pmId);
  };

  return (
    <div className="mt-6 border border-light-gray bg-off-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-label font-bold uppercase text-near-black">
          Add New Payment Method
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-dark-gray transition-colors hover:text-blue"
          aria-label="Cancel"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="max-w-md space-y-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="card-name">Name on Card</label>
          <input
            id="card-name"
            ref={nameRef}
            type="text"
            autoComplete="cc-name"
            value={cardName}
            placeholder="As it appears on your card"
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            onChange={(e) => {
              setCardName(e.target.value);
              if (e.target.value.trim()) setNameError("");
            }}
            className={`h-10 w-full border bg-white px-3 text-link text-near-black placeholder-dark-gray outline-none transition-colors ${
              nameError ? "border-red-400" : nameFocused ? "border-blue" : "border-light-gray"
            }`}
          />
          {nameError ? <p className="mt-1 text-xs text-red-600">{nameError}</p> : null}
        </div>

        <div>
          <label className={LABEL_CLASS}>Card Number</label>
          <div
            className={`flex h-10 items-center border bg-white px-3 transition-colors ${
              numberError ? "border-red-400" : numberFocused ? "border-blue" : "border-light-gray"
            }`}
          >
            <CardNumberElement
              options={{ ...ELEMENT_STYLE, showIcon: true }}
              className="w-full"
              onFocus={() => setNumberFocused(true)}
              onBlur={() => setNumberFocused(false)}
              onChange={(e) => {
                setNumberComplete(e.complete);
                if (e.error) setNumberError(e.error.message);
                else {
                  setNumberError("");
                  if (e.complete) expiryRef.current?.focus();
                }
              }}
            />
          </div>
          {numberError ? <p className="mt-1 text-xs text-red-600">{numberError}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>Expiry Date</label>
            <div
              className={`flex h-10 items-center border bg-white px-3 transition-colors ${
                expiryError ? "border-red-400" : expiryFocused ? "border-blue" : "border-light-gray"
              }`}
            >
              <CardExpiryElement
                options={ELEMENT_STYLE}
                className="w-full"
                onReady={(el) => { expiryRef.current = el; }}
                onFocus={() => setExpiryFocused(true)}
                onBlur={() => setExpiryFocused(false)}
                onChange={(e) => {
                  setExpiryComplete(e.complete);
                  if (e.error) setExpiryError(e.error.message);
                  else {
                    setExpiryError("");
                    if (e.complete) cvcRef.current?.focus();
                  }
                }}
              />
            </div>
            {expiryError ? <p className="mt-1 text-xs text-red-600">{expiryError}</p> : null}
          </div>
          <div>
            <label className={LABEL_CLASS}>Security Code</label>
            <div
              className={`flex h-10 items-center border bg-white px-3 transition-colors ${
                cvcError ? "border-red-400" : cvcFocused ? "border-blue" : "border-light-gray"
              }`}
            >
              <CardCvcElement
                options={ELEMENT_STYLE}
                className="w-full"
                onReady={(el) => { cvcRef.current = el; }}
                onFocus={() => setCvcFocused(true)}
                onBlur={() => setCvcFocused(false)}
                onChange={(e) => {
                  setCvcComplete(e.complete);
                  if (e.error) setCvcError(e.error.message);
                  else setCvcError("");
                }}
              />
            </div>
            {cvcError ? <p className="mt-1 text-xs text-red-600">{cvcError}</p> : null}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !stripe}
            className="inline-flex items-center gap-2 bg-amber px-6 py-2.5 text-link font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save Card"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-link font-semibold text-dark-gray transition-colors hover:text-blue"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Saved card row                                                       */
/* ------------------------------------------------------------------ */

function CardRow({
  card,
  showMakeDefault,
  onDelete,
  onMakeDefault,
}: {
  card: SavedCard;
  /** Hidden with a single card — one saved card is inherently the default (WC standard). */
  showMakeDefault: boolean;
  onDelete: (id: string) => Promise<void>;
  onMakeDefault: (tokenId: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(card.stripe_pm_id);
    setIsDeleting(false);
  };

  const handleMakeDefault = async () => {
    setIsSettingDefault(true);
    await onMakeDefault(card.id);
    setIsSettingDefault(false);
  };

  return (
    <div className="flex items-center gap-4 border border-light-gray bg-white p-4">
      <div className="flex shrink-0 items-center justify-center bg-off-white">
        <CardBrandIcon brand={card.brand} size="md" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="flex items-center gap-2 text-body font-semibold text-near-black">
          {brand_label(card.brand)} ending in {card.last4}
          {card.is_default ? (
            <span className="inline-flex items-center gap-1 bg-navy px-2 py-0.5 text-link font-bold uppercase tracking-wide text-white">
              <Star className="size-2.5 fill-current" aria-hidden="true" />
              Default
            </span>
          ) : null}
        </p>
        <p className="text-link text-dark-gray">
          Expires {exp_label(card.exp_month, card.exp_year)}
        </p>
      </div>
      {showMakeDefault && !card.is_default ? (
        <button
          type="button"
          onClick={() => void handleMakeDefault()}
          disabled={isSettingDefault || isDeleting}
          className="inline-flex items-center gap-1.5 border border-light-gray px-3 py-1.5 text-link font-semibold uppercase text-dark-gray transition-colors hover:border-blue hover:text-blue disabled:opacity-50"
          aria-label={`Make ${brand_label(card.brand)} ending in ${card.last4} the default`}
        >
          <Star className="size-3.5" aria-hidden="true" />
          {isSettingDefault ? "Saving…" : "Make Default"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={isDeleting || isSettingDefault}
        className="inline-flex items-center gap-1.5 border border-light-gray px-3 py-1.5 text-link font-semibold uppercase text-dark-gray transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
        aria-label={`Delete ${brand_label(card.brand)} ending in ${card.last4}`}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        {isDeleting ? "Removing…" : "Remove"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main panel                                                           */
/* ------------------------------------------------------------------ */

function PaymentMethodsPanelInner() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [setupError, setSetupError] = useState("");
  const [finalizeError, setFinalizeError] = useState("");
  const didFetch = useRef(false);

  const loadCards = useCallback(async () => {
    try {
      const res = await fetch("/api/account/payment-methods", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { payment_methods: SavedCard[] };
      setCards(data.payment_methods ?? []);
    } catch {
      setLoadError("Unable to load payment methods.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    void loadCards();
  }, [loadCards]);

  const handleAddClick = async () => {
    setSetupError("");
    setFinalizeError("");
    try {
      const res = await fetch("/api/account/payment-methods", {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        // Surface the upstream reason — a bare generic message hides whether
        // WP rejected the session, Stripe keys are missing, or the customer
        // record could not be created.
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || `Card setup failed (error ${res.status}).`);
      }
      const data = (await res.json()) as { client_secret: string };
      setClientSecret(data.client_secret);
      setShowAddForm(true);
    } catch (error) {
      setSetupError(
        error instanceof Error && error.message
          ? `Could not initialise card form: ${error.message}`
          : "Could not initialise card form. Please try again."
      );
    }
  };

  const handleCardAdded = async (pmId: string) => {
    setShowAddForm(false);
    setClientSecret("");
    setIsLoading(true);

    // Register the confirmed Stripe PM as a WC payment token — the list (and
    // checkout) read WC tokens, so without this the new card never appears.
    const finalize = await fetch("/api/account/payment-methods/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pm_id: pmId }),
    }).catch(() => null);

    if (!finalize?.ok) {
      const data = await finalize?.json().catch(() => ({})) as { message?: string } | undefined;
      const msg = data?.message || "Card was saved at Stripe but could not be registered — please try again.";
      notifyError(msg);
      setFinalizeError(msg);
    } else {
      setFinalizeError("");
      notifySuccess("Card saved successfully.");
    }

    await loadCards();
  };

  const handleDelete = async (stripePmId: string) => {
    const res = await fetch(`/api/account/payment-methods/${stripePmId}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setCards((prev) => prev.filter((c) => c.stripe_pm_id !== stripePmId));
      notifySuccess("Card removed.");
    } else {
      const data = await res?.json().catch(() => ({})) as { message?: string } | undefined;
      notifyError(data?.message || "Could not remove card — please try again.");
    }
  };

  const handleMakeDefault = async (tokenId: string) => {
    const res = await fetch(`/api/account/payment-methods/${tokenId}/default`, {
      method: "POST",
    }).catch(() => null);
    if (res?.ok) {
      setCards((prev) => prev.map((c) => ({ ...c, is_default: c.id === tokenId })));
      notifySuccess("Default payment method updated.");
    } else {
      const data = await res?.json().catch(() => ({})) as { message?: string } | undefined;
      notifyError(data?.message || "Could not update default card — please try again.");
    }
  };

  if (isLoading) return <PaymentSkeleton />;

  if (loadError) {
    return <p className="text-link text-red-600">{loadError}</p>;
  }

  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-link text-dark-gray">
        Saved payment methods are used at checkout. Card numbers are stored securely
        by Stripe — this site never sees full card details.
      </p>

      {cards.length > 0 ? (
        <div className="mb-6 space-y-3">
          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              showMakeDefault={cards.length > 1}
              onDelete={handleDelete}
              onMakeDefault={handleMakeDefault}
            />
          ))}
        </div>
      ) : (
        <div className="mb-6 border border-light-gray bg-off-white p-5">
          <p className="text-link text-dark-gray">No payment methods saved yet.</p>
        </div>
      )}

      {setupError ? (
        <p className="mb-4 text-sm text-red-600">{setupError}</p>
      ) : null}

      {finalizeError ? (
        <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <strong className="font-semibold">Card not saved: </strong>{finalizeError}
        </div>
      ) : null}

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => void handleAddClick()}
          className="inline-flex items-center gap-2 bg-amber px-6 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Payment Method
        </button>
      ) : null}

      {/* key={clientSecret} guarantees a fresh Elements + iframe mount for
          every new SetupIntent. Without it React may reuse the previous
          Stripe iframe, leaving numberComplete/expiryComplete/cvcComplete
          as false (their initial state) and silently blocking submission.
          Do NOT pass clientSecret TO Elements — legacy card elements pass
          it directly to confirmCardSetup(). Setting it here activates
          Stripe.js "deferred intent" mode which conflicts with CardNumberElement. */}
      {showAddForm && clientSecret ? (
        <Elements key={clientSecret} stripe={stripePromise}>
          <AddCardForm
            clientSecret={clientSecret}
            onSuccess={(pmId) => void handleCardAdded(pmId)}
            onCancel={() => {
              setShowAddForm(false);
              setClientSecret("");
            }}
          />
        </Elements>
      ) : null}
    </div>
  );
}

export default function PaymentMethodsPanel() {
  return <PaymentMethodsPanelInner />;
}
