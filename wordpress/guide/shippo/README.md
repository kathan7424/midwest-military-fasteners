# Shippo Integration — Complete Operations Guide

> **Reference pair:** [`../shippo-guide.md`](../shippo-guide.md) covers architecture and FR mapping.
> This folder covers day-to-day operations: root cause of missing rates, the product data fix,
> and a reproducible end-to-end test you can run any time.

---

## Why orders show "Package required" in Shippo

```
WC Product (missing weight/dims)
        │
        ▼  Shippo plugin reads get_weight() → 0
        │               get_length()        → 0
        │               get_width()         → 0
        │               get_height()        → 0
        ▼
Shippo receives order with no package data
        │
        ▼
"RATES UNAVAILABLE — Package info required + Package weight required"
        │
        ▼
Admin must manually enter dims in Shippo every order (slow, error-prone)
```

**Fix:** Set `Weight` + `Length × Width × Height` on every WooCommerce product.
The Shippo plugin reads these from WC native product fields automatically — no code change needed.

---

## Root cause in the import CSV

The MMF master import CSV has a column `SHIPPING DIMENSIONS HxWxL` (column H)
and `SHIPPING WEIGHT` (column I). Many products were imported with these **blank**.

`import.php` sets WC native fields only when the value is > 0:

```php
$height = floatval( $parts[0] );   // H in inches
$width  = floatval( $parts[1] );   // W in inches
$length = floatval( $parts[2] );   // L in inches
if ( $height > 0 ) $product->set_height( ... );
if ( $width  > 0 ) $product->set_width( ... );
if ( $length > 0 ) $product->set_length( ... );
```

**Rule going forward:** Never leave `SHIPPING DIMENSIONS HxWxL` or `SHIPPING WEIGHT` blank
in the master import CSV. Every product must have both, otherwise Shippo cannot quote rates
and admin must enter package info manually for every order.

---

## Fix A — Update existing products via WC CSV import (fastest, bulk)

Use [`existing-weight-fix.csv`](existing-weight-fix.csv).

1. **WP Admin → Products → Import**
2. Choose file → `existing-weight-fix.csv` → Continue
3. Column mapping:
   - `SKU` → **SKU**
   - `Weight` → **Weight (lbs)**
   - `Length` → **Length (in)**
   - `Width` → **Width (in)**
   - `Height` → **Height (in)**
4. ✅ Check **"Update existing products"**
5. Run the Importer

Verify: Edit any updated product → **Shipping tab** → Weight + dims filled.

---

## Fix B — Re-import from master CSV with dims filled

Use `test-products.csv` as a reference for the correct MMF import format.
Add `SHIPPING DIMENSIONS HxWxL` (e.g. `3x5x7`) and `SHIPPING WEIGHT` (lbs)
to every row, then re-import via **WP Admin → MMF Product Import**.

---

## Fix C — Manual (single product)

1. WP Admin → Products → Edit product
2. **Product data → Shipping tab**
3. Set **Weight** (lbs) and **Dimensions** L × W × H (inches)
4. Update

---

## WooCommerce unit settings (must match CSV units)

**WP Admin → WooCommerce → Settings → General → Measurements:**

| Setting | Required value |
|---|---|
| Weight unit | **lbs** |
| Dimensions unit | **in** (inches) |

If the store is set to `kg` / `cm`, multiply: 1 lb = 0.4536 kg, 1 in = 2.54 cm.

---

## Shippo plugin settings (one-time)

**WP Admin → WooCommerce → Settings → Shipping → Shippo**

| Setting | Value |
|---|---|
| Shippo API token | (from Shippo dashboard — never in code/git) |
| Ship-from address | MMF warehouse address |
| Parcel packing | "Pack items individually" is safest for start |
| Live rates at checkout | Enabled |
| Auto-sync orders | Enabled |

**Carrier connections (in Shippo dashboard):**
Connect UPS + FedEx carrier accounts so commercial rates apply.

---

## Webhook (auto-complete on delivery)

The webhook marks WC orders as "Shipped" when Shippo reports DELIVERED.

**Setup:**

1. **WP Admin → WooCommerce → Settings → Integration → Shippo Webhook**
   → copy the URL shown (`/wp-json/custom/v1/shippo/webhook`)
2. **Shippo dashboard → Settings → API → Webhooks → Add Webhook**
   → event `track_updated` → paste URL
3. Copy Shippo's **signing secret** → paste into WC settings → Save
4. Toggle **Auto-Complete on Delivery** ON

**Debug log:**
Toggle **Debug log → Enable logging** on the same settings page.
View: **WooCommerce → Status → Logs**, source `mmf-shippo-webhook`.

---

## Order matching — best practice

When purchasing a label in Shippo, set the **label metadata** = WC order ID (e.g. `4308`).
The webhook searches: metadata → tracking-number meta → order-id patterns.
Without metadata, matching is slower and may miss if tracking isn't stored on the order yet.

---

## Files in this folder

| File | Purpose |
|---|---|
| `README.md` | This guide |
| `end-to-end-test.md` | Step-by-step test from product import → label → tracking in My Account |
| `test-products.csv` | 5 test products (MMF import format) with correct weight + dims |
| `existing-weight-fix.csv` | WC-native CSV to add weight/dims to already-imported products |

---

*Pairs with [`../shippo-guide.md`](../shippo-guide.md), [`../shipping-payments-guide.md`](../shipping-payments-guide.md), [`../test-cases.md`](../test-cases.md).*
