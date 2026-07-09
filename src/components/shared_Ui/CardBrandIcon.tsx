/**
 * File Name: CardBrandIcon.tsx
 * Description: Stripe card brand icons — colored pill badges for Visa, MC,
 *   Amex, Discover, etc. Used in checkout (brand row) and My Account saved
 *   card list. Background color is a runtime value (brand from Stripe API),
 *   so inline style is the intentional exception per the project style guide.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

const BRANDS: Record<string, { bg: string; label: string }> = {
  visa:       { bg: "#1434CB", label: "VISA" },
  mastercard: { bg: "#EB001B", label: "MC"   },
  amex:       { bg: "#2E77BC", label: "AMEX" },
  discover:   { bg: "#FF6600", label: "DISC" },
  diners:     { bg: "#697689", label: "DC"   },
  jcb:        { bg: "#003087", label: "JCB"  },
  unionpay:   { bg: "#B71234", label: "UP"   },
};

const CHECKOUT_BRANDS = ["visa", "mastercard", "amex", "discover"] as const;

export function CardBrandIcon({
  brand,
  dim = false,
  size = "sm",
}: {
  brand: string;
  dim?: boolean;
  /** sm = 20×32 px (checkout row / My Account list), md = 24×40 px (standalone) */
  size?: "sm" | "md";
}) {
  const b = BRANDS[brand.toLowerCase()] ?? { bg: "#8c9ba5", label: "···" };
  const sizeClass = size === "md"
    ? "h-6 w-10 text-[9px]"
    : "h-5 w-8 text-[8px]";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded font-bold tracking-wide text-white transition-opacity ${sizeClass} ${dim ? "opacity-20" : "opacity-100"}`}
      style={{ backgroundColor: b.bg }}
    >
      {b.label}
    </span>
  );
}

/**
 * Shows the 4 checkout-relevant brands. When a brand is detected, the
 * non-matching ones dim to 20% opacity — same UX as WooCommerce Stripe.
 */
export function CardBrandRow({ detected }: { detected: string }) {
  const hasDetection = !!detected && detected !== "unknown";
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {CHECKOUT_BRANDS.map((b) => (
        <CardBrandIcon
          key={b}
          brand={b}
          dim={hasDetection && detected !== b}
        />
      ))}
    </div>
  );
}
