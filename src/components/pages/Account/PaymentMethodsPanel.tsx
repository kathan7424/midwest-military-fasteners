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
import { loadStripe } from "@stripe/stripe-js";
import { Trash2, Plus, X } from "lucide-react";

import { CardBrandIcon } from "@/components/shared_Ui/CardBrandIcon";
import { LABEL_CLASS } from "@/components/shared_Ui/form-styles";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
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
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setFormError("");

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setFormError("Card form not ready. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardNumber },
    });

    if (error) {
      setFormError(error.message ?? "Failed to save card. Please try again.");
      setIsSubmitting(false);
      return;
    }

    onSuccess();
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
          <label className={LABEL_CLASS}>
            Card Number
          </label>
          <div className="flex h-10 items-center border border-light-gray bg-white px-3 focus-within:border-blue">
            <CardNumberElement options={{ ...ELEMENT_STYLE, showIcon: true }} className="w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>
              Expiry Date
            </label>
            <div className="flex h-10 items-center border border-light-gray bg-white px-3 focus-within:border-blue">
              <CardExpiryElement options={ELEMENT_STYLE} className="w-full" />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>
              Security Code
            </label>
            <div className="flex h-10 items-center border border-light-gray bg-white px-3 focus-within:border-blue">
              <CardCvcElement options={ELEMENT_STYLE} className="w-full" />
            </div>
          </div>
        </div>

        {formError ? (
          <p className="text-sm text-red-600">{formError}</p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !stripe}
            className="inline-flex items-center gap-2 bg-amber px-6 py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save Card"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-semibold text-dark-gray transition-colors hover:text-blue"
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
  onDelete,
}: {
  card: SavedCard;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(card.id);
    setIsDeleting(false);
  };

  return (
    <div className="flex items-center gap-4 border border-light-gray bg-white p-4">
      <div className="flex size-9 shrink-0 items-center justify-center bg-off-white">
        <CardBrandIcon brand={card.brand} size="md" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-near-black">
          {brand_label(card.brand)} ending in {card.last4}
        </p>
        <p className="text-xs text-dark-gray">
          Expires {exp_label(card.exp_month, card.exp_year)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={isDeleting}
        className="inline-flex items-center gap-1.5 border border-light-gray px-3 py-1.5 text-xs font-semibold uppercase text-dark-gray transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
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
    try {
      const res = await fetch("/api/account/payment-methods", {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Setup intent failed");
      const data = (await res.json()) as { client_secret: string };
      setClientSecret(data.client_secret);
      setShowAddForm(true);
    } catch {
      setSetupError("Could not initialise card form. Please try again.");
    }
  };

  const handleCardAdded = async () => {
    setShowAddForm(false);
    setClientSecret("");
    setIsLoading(true);
    await loadCards();
  };

  const handleDelete = async (pmId: string) => {
    try {
      await fetch(`/api/account/payment-methods/${pmId}`, { method: "DELETE" });
      setCards((prev) => prev.filter((c) => c.id !== pmId));
    } catch {
      // silent — card stays in list, user can retry
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
            <CardRow key={card.id} card={card} onDelete={handleDelete} />
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

      {showAddForm && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <AddCardForm
            clientSecret={clientSecret}
            onSuccess={() => void handleCardAdded()}
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
