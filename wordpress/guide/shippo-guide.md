# Shippo Integration Guide — Module 10: Shipping & Order Fulfillment

How shipping works on this headless build, what the Shippo plugin does when it
lands, and exactly what to configure and test on day one. The frontend is
**already Shippo-compatible** — no frontend code changes are needed when the
plugin is activated.

**Status: waiting on client's Shippo account credentials.** Everything below
that doesn't need the plugin is built and live.

---

## 1. Architecture — one rule

> **Shipping lives in WooCommerce. The frontend renders what the API returns.**

```
Customer at checkout
   │
   ▼
Next.js /api/cart/customer  (address → WC Store API)
   │
   ▼
WooCommerce Store API  →  asks ALL registered shipping methods for rates
   │                        ├── Flat rate / Free shipping (zones, built-in)
   │                        └── Shippo live rates (plugin, when active)
   ▼
cart.shipping_rates[]  →  checkout renders every rate as a radio option
```

The checkout shipping-method list is **fully dynamic** ([CheckoutPageView.tsx](../../src/components/pages/Checkout/CheckoutPageView.tsx)
renders `checkout.shipping_packages[].shipping_rates[]` — name, price,
selected). When the Shippo plugin registers its live-rate method, UPS/FedEx
rates appear at checkout automatically. Zero frontend work.

## 2. Functional requirements → where each one is satisfied

| FR | Requirement | Where it lives | Status |
|---|---|---|---|
| FR-SHIP-01 | Real-time estimates at checkout, added to total | WC Store API `shipping_rates` → checkout radio list; auto-refresh on address change via `/api/cart/customer` | ✅ Built (plugin adds live rates) |
| FR-SHIP-02 | Shipping cost recorded on order + confirmation | WC core — chosen rate stored on the order; success page + emails show it; order detail shows `shipping_total` | ✅ Built |
| FR-SHIP-03 | Tracking number on order, in email, in My Account | `mmf_get_order_tracking()` exposes tracking on `/custom/v1/orders` + `/custom/v1/orders/{id}`; OrderDetailPanel shows a "Shipment Tracking" section; the shipping email is sent by WC/plugin with the number | ✅ Built (populates when plugin writes tracking) |
| FR-SHIP-04 | Client's Shippo account, UPS + FedEx connected | Shippo dashboard — client action | ⏳ Client credentials pending |
| FR-SHIP-05 | Admin generates labels through Shippo | Shippo dashboard / plugin order actions — no custom code | ⏳ Plugin install |
| FR-SHIP-06 | Admin tracks shipments through Shippo | Shippo dashboard — no custom code | ⏳ Plugin install |

## 3. What is already built (works today, without the plugin)

- **Product shipping data**: the CSV import writes tier-1 weight (lbs) and
  dimensions (H×W×L inches) to **WC native product fields** — exactly what
  Shippo reads to quote rates ([import.php](../inc/import.php), "SHIPPING
  HELPERS — WC native fields for Shippo"). Import warns on any product missing
  weight or dims, because Shippo cannot quote without both.
- **Checkout rates UI**: renders any number of packages/rates, radio
  selection posts back to the Store API (`select-shipping-rate`), totals
  recalculate server-side. Rates auto-refresh when the address changes.
- **Zone methods as interim**: Free Shipping (Michigan zone) + Flat Rate (US)
  work now and keep working after Shippo — WC simply lists Shippo's rates
  alongside (remove the zone methods if only live rates should show).
- **Tracking API + UI**: order endpoints return a `tracking` array; the
  My Account order detail shows carrier + linked tracking number + ship date.
- **US-only**: selling/shipping countries come from WC → General settings
  (already US-restricted) — checkout country dropdowns follow automatically.

## 4. Tracking — how the data flows

`mmf_get_order_tracking()` in [order-documents.php](../inc/order-documents.php)
reads tracking from every place the common plugins write it, in this order:

1. `_wc_shipment_tracking_items` — Shipment Tracking / Advanced Shipment
   Tracking format (array: number, provider, custom link, date shipped).
   Several Shippo-ecosystem plugins write this format for compatibility.
2. `_shippo_tracking_number` / `_shippo_carrier` / `_shippo_tracking_url`
3. `shippo_tracking_number` / `shippo_carrier` / `shippo_tracking_url`
4. `_tracking_number` / `_tracking_provider` / `_tracking_url` (generic)

If the plugin stores no URL, we build the public carrier link ourselves
(UPS / FedEx / USPS / DHL — `mmf_carrier_tracking_url()`); unknown carriers
show the bare number. **If the real plugin uses a different meta key**, hook
the `mmf_order_tracking_entries` filter — do NOT edit the reader.

The API response shape (both order endpoints):

```json
"tracking": [
  {
    "tracking_number": "1Z999AA10123456784",
    "carrier": "UPS",
    "url": "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    "date_shipped": "July 9, 2026"
  }
]
```

Frontend: `OrderTrackingEntry` in
[account.client.ts](../../src/services/account.client.ts); rendered by the
"Shipment Tracking" section in
[OrderDetailPanel.tsx](../../src/components/pages/Account/OrderDetailPanel.tsx)
— hidden until at least one entry exists.

## 5. Day-one setup checklist (when client credentials arrive)

1. **Shippo dashboard** (client's account): connect MMF's UPS and FedEx
   carrier accounts. Carrier/service costs bill to the client — their account,
   their responsibility (FR-SHIP-04).
2. **Install the Shippo for WooCommerce plugin** on WP, connect it with the
   client's Shippo API token. *Token goes in the plugin settings only — never
   in code, never in this repo, never in these guides.*
3. **Ship-from address**: set MMF's warehouse address in the plugin/Shippo
   settings — rates are quoted from this origin.
4. **Enable Shippo rates** in WooCommerce → Settings → Shipping (the plugin
   adds its method — add it to the US zone, or let it replace Flat Rate).
5. **Decide the interim methods**: keep or remove Free Shipping (Michigan) +
   Flat Rate once live rates work. Business call — both can coexist.
6. **Packing defaults**: verify products carry weight + dims (import already
   warns); set a default box/packing strategy in the plugin if offered.
7. **Test the whole loop on staging** (section 6) before production.

## 6. Test plan (add results to test-cases.md TC-SHIP)

| Step | Expected |
|---|---|
| Checkout with a MI address | Live UPS/FedEx rates listed (+ Free Shipping if kept); prices look sane |
| Checkout with a non-MI US address | Live rates listed; selecting one updates the total instantly |
| Change the address mid-checkout | Rates refresh automatically (no manual reload) |
| Place the order | Chosen carrier/service + cost on the order (wp-admin) and on the confirmation |
| Generate a label in Shippo for the order | Label PDF produced; tracking number written back to the WC order |
| Check the WC order after label creation | Tracking number visible in order meta/notes |
| Customer: My Account → order detail | "Shipment Tracking" section: carrier + clickable tracking number |
| Shipping-notification email | Contains the tracking number/link |
| Product with no weight/dims | No live rate (or plugin error) — fix the product data, don't hack the checkout |

## 7. Security rules for this module

- **No Shippo API token in code, config files in git, or guides.** Plugin
  settings (DB) or wp-config constants on the server only.
- **The frontend never calls Shippo.** Rates, labels, tracking writes — all
  happen inside WP/WC or the Shippo dashboard. The browser only ever sees the
  same-origin Next.js proxy routes.
- **Tracking output is sanitized** at the WP boundary (`sanitize_text_field`,
  `esc_url_raw`) and rendered as text/links (no HTML injection path).
- **Order endpoints stay owner-locked**: `/custom/v1/orders*` requires login
  and checks `get_customer_id() === get_current_user_id()` — tracking numbers
  are personal data; they must never leak across accounts.
- **Label generation stays in wp-admin/Shippo** — never expose a label or
  fulfilment endpoint to the storefront.

## 8. Boundaries (what we deliberately do NOT build)

- No custom Shippo API client — the plugin owns the Shippo connection.
- No custom label UI in wp-admin — Shippo's own dashboard is the tool the
  client chose for day-to-day fulfilment.
- No frontend shipping math — prices, taxes on shipping, totals: all WC.
- No international shipping — US-only per the SOW; enforced by WC selling/
  shipping country settings, not code.

---

*Pairs with [shipping-payments-guide.md](shipping-payments-guide.md) (zones,
Stripe, Net 30), [headless-rules.md](headless-rules.md) (Rule 1: WC decides),
[qa-guide.md](qa-guide.md), [test-cases.md](test-cases.md).*
