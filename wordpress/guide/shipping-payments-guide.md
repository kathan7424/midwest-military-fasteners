# Shipping (Shippo) & Payments (Stripe) — Integration Guide

How shipping and payments work on the Midwest Military Fasteners headless store,
what the SOW requires, and exactly what to configure where.

---

## 1. Architecture Overview

```
React / Next.js frontend  (localhost:3000 / production domain)
        │
        │  Next.js API proxy routes (cookies + session forwarded)
        ▼
WooCommerce Store API  (dev-mmf-wp.pantheonsite.io/wp-json/wc/store/v1/*)
        │
        ├── Shipping rates   ← WC Shipping Zones (Shippo live rates method)
        ├── Payment          ← WooCommerce Stripe Gateway plugin
        └── Orders           → real WooCommerce orders
                                    │
                                    ▼
                              Shippo (order sync → labels → tracking)
```

**The key fact:** the checkout creates **genuine WooCommerce orders** via the
official Store API. Shippo and Stripe never know (or care) that the storefront
is React — they talk to WooCommerce, exactly as documented by both vendors.

---

## 2. Checkout Flow (built)

1. Customer fills address on `/checkout` → `POST /wc/store/v1/cart/update-customer`
2. WooCommerce recalculates **shipping rates + tax** for that address → rates
   render as radio options (real-time estimates)
3. Customer picks a rate → `POST /wc/store/v1/cart/select-shipping-rate` → totals update
4. Customer enters card → **Stripe Elements** creates a PaymentMethod
   **in the browser, directly with Stripe** (card data never touches our servers — PCI standard)
5. `POST /wc/store/v1/checkout` with `payment_data` keys the Stripe gateway
   (UPE / deferred intent) requires:
   `payment_method: "stripe"`, `wc-stripe-payment-method: pm_...`,
   `wc-stripe-is-deferred-intent: true`
6. 3D Secure cards: the gateway returns a confirm hash in `redirect_url` —
   the checkout runs `stripe.confirmCardPayment()` in the browser, then continues
7. Order created in WooCommerce → customer lands on `/checkout/success` — a
   WooCommerce-style order-received page (order number, date, total, payment method)

---

## 3. SOW Compliance Checklist

> *"The website will integrate with Shippo to support shipping calculations,
> label generation, shipment tracking, and fulfillment workflows."*

| SOW Requirement | How it is fulfilled | Where |
|---|---|---|
| Real-time shipping estimates | Address entered at checkout → WC Store API returns live rates from shipping zones → shown/selected in checkout UI | Built (frontend + WC) |
| Shipping carrier integrations | Carriers (USPS, UPS, FedEx…) connect inside Shippo; rates and labels use those accounts | Shippo dashboard |
| Shipping label generation | WooCommerce orders auto-sync to Shippo (official connection); labels printed from Shippo | Shippo dashboard |
| Shipment tracking | When a label is created, Shippo writes the tracking number back to the WooCommerce order and the customer gets the tracking email | Automatic |

**Compatibility with Shippo's WooCommerce doc**
([Connecting a WooCommerce Store with Shippo](https://support.goshippo.com/hc/en-us/articles/207450406)):
that connection works over the **WooCommerce REST API** — it syncs *orders* from
WooCommerce into Shippo. Because our checkout produces standard WooCommerce
orders with full shipping addresses, line items, weights and dimensions, the
integration is 100% compatible. Nothing custom, nothing non-standard.

---

## 4. Shipping Data — WooCommerce Standard (no ACF)

| Data | Lives in | Who reads it |
|---|---|---|
| Package weight (lbs) | WC product → Shipping tab → Weight | Shippo, rate calculation |
| Box dimensions (L×W×H in) | WC product → Shipping tab → Dimensions | Shippo, rate calculation |

- Set by CSV import: col 8 (`SHIPPING DIMENSIONS HxWxL`) + col 9 (`SHIPPING WEIGHT`),
  with col 33 (`PER PIECE WEIGHT`) as fallback. Or edit manually in the Shipping tab.
- **Weight scales with quantity automatically** — 10 packages × 0.65 lbs = 6.5 lbs
  total sent to the carrier. Standard WooCommerce behavior.
- **Dimensions are per-package** — multi-package box packing is configured in
  Shippo (dashboard → box/parcel settings). No platform auto-multiplies box
  dimensions; this is the industry-standard approach.
- Import **Preview** warns when a row is missing dims or weight
  (`Shippo cannot quote`) so bad data never reaches the store.

---

## 5-pre. Temporary Shipping (until Shippo is connected)

No code changes needed — the headless checkout renders whatever methods the
WooCommerce shipping zones return. Configure a temporary method:

```
WP Admin → WooCommerce → Settings → Shipping → Shipping zones
  → Add zone
      Zone name : United States
      Zone regions : United States (US)
  → Add shipping method:
      Option A — Flat rate   → cost e.g. 12.00 (realistic while testing totals)
      Option B — Free shipping → no requirement (simplest for dev)
```

- The method appears at checkout as a radio option automatically after the
  customer's address is entered.
- Both can be added — the customer picks; WooCommerce sorts by your zone order.
- **When Shippo goes live:** delete the temporary method, add Shippo live
  rates to the same zone — the checkout switches to real carrier rates with
  zero frontend changes.
- The checkout also supports "Ship to a different address?" (WC standard) —
  rates and tax always follow the **shipping** address, like WooCommerce core.

## 5a. What to Collect From the Client (before Shippo setup)

| # | Item | Why it's needed | Notes |
|---|---|---|---|
| 1 | **Shippo account access** | All setup happens in their Shippo dashboard | Ask them to create an account at goshippo.com (free) and invite the dev email as a team member — never share passwords |
| 2 | **Ship-from / warehouse address** | Origin for every rate quote and label | Full street address + phone; must match where parts actually ship from |
| 3 | **Carrier accounts** | Live rates + labels bill to their accounts | UPS / FedEx / USPS account numbers (they connect them inside Shippo → Settings → Carriers). No carrier account? Shippo's built-in USPS master rates work day one |
| 4 | **Which services to offer** | Controls the rate options shoppers see | e.g. Ground only? 2-Day? Overnight? Domestic-only or international? |
| 5 | **Standard box sizes** | Shippo parcel templates for multi-package orders | L×W×H + max weight per box they actually pack with |
| 6 | **Shipping pricing policy** | Business decision, not technical | Pass through exact carrier rate? Add handling fee? Free shipping over $X? |
| 7 | **Insurance / signature rules** | High-value military parts may need it | e.g. signature required over $500? |
| 8 | **WooCommerce admin approval** | Store connection uses a WC REST API key | We generate the key in WP Admin — just confirm they approve the connection |

**Ask in one message:** "Shippo account banavi ne [dev email] invite karo, ship-from address,
carrier account numbers (UPS/FedEx/USPS), kaya services offer karva che, box sizes,
ane shipping charge policy (exact rate / handling fee / free over $X) moklo."

## 5. Setup — Shippo (one-time, WP/Shippo dashboards)

1. **Connect the store**: Shippo dashboard → Stores → Connect WooCommerce →
   follow the official doc (uses a WooCommerce REST API key from
   WP Admin → WooCommerce → Settings → Advanced → REST API).
2. **Connect carriers** in Shippo (USPS/UPS/FedEx accounts or Shippo's built-in rates).
3. **Real-time rates at checkout**: install/activate the Shippo live rates
   shipping method (or the chosen rates plugin) and add it to
   WP Admin → WooCommerce → Settings → Shipping → Shipping Zones.
   The headless checkout picks up whatever methods the zones return — zero code changes.
4. Test: place an order → it appears in Shippo → create label → tracking number
   appears on the WC order.

## 6. Setup — Stripe

**Backend (done):** WooCommerce Stripe Gateway plugin active with API keys
(WP Admin → WooCommerce → Settings → Payments → Stripe).

**Frontend (required):** the browser needs the **publishable key only** to
render the card field. Add to the Next.js environment:

```
# .env.local (development) / hosting env vars (production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- Must be the **same Stripe account** as the WP plugin.
- The **secret key (sk_...) stays in WordPress only** — the frontend never needs
  it and must never contain it. Card charging happens server-side in the
  WooCommerce Stripe Gateway.
- Test mode → `pk_test_...`; going live → swap to `pk_live_...` (and the plugin
  to live keys) — no code changes.
- Restart the dev server after editing `.env.local`.

**Test cards** (Stripe test mode): `4242 4242 4242 4242`, any future expiry,
any CVC — succeeds. `4000 0000 0000 0002` — declines.

---

## 7. Environment Variables Reference (frontend)

| Variable | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe card field at checkout | `pk_test_...` |
| `REVALIDATION_SECRET` | WP → Next.js instant cache refresh webhook | long random string |
| `NEXT_PUBLIC_WP_API` / `NEXT_PUBLIC_WP_SITE_URL` | WordPress endpoints | already configured |

WordPress `wp-config.php` (for instant home-page updates):

```php
define( 'MMF_NEXTJS_URL', 'https://your-frontend-domain.com' );
define( 'MMF_NEXTJS_REVALIDATION_SECRET', 'same-value-as-REVALIDATION_SECRET' );
```

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Payment is not configured" on /checkout | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` missing | Add to .env.local, restart server |
| No shipping rates after address | No shipping method covers that address | Check WooCommerce → Shipping Zones (add Shippo live rates / zone for that region) |
| Rates show but wrong price | Product weight/dims missing or wrong | Product → Shipping tab; re-import CSV with cols 8–9 filled |
| Card accepted but order fails | WP Stripe plugin keys wrong account/mode | Match test/live mode between plugin keys and frontend pk_ key |
| Order not appearing in Shippo | Store connection stale | Reconnect per Shippo doc; check WC REST API key permissions (Read) |
