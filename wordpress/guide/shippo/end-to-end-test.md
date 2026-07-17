# Shippo End-to-End Test — Start to Finish

Run this every time after a product import or Shippo config change.
Captures the full loop: product data → checkout rates → order → label → tracking → My Account.

**Pre-conditions:**
- Shippo WC plugin installed and API token set
- Ship-from address set in plugin
- At least one UPS or FedEx carrier connected in Shippo dashboard
- `test-products.csv` imported (see step 1 below)
- WooCommerce weight unit = **lbs**, dimensions unit = **in**

---

## Step 1 — Import test products

1. WP Admin → **Products → Import**
2. Upload `test-products.csv` (in this folder — WC native format)
3. Column mapping:
   - SKU → SKU
   - Weight → Weight (lbs)
   - Length → Length (in)
   - Width → Width (in)
   - Height → Height (in)
4. ✅ "Update existing products" checked
5. Run Importer → all 5 rows imported/updated

**Verify:** Edit `MMF-TEST-001` → Shipping tab → Weight = `1.5`, Length = `8`, Width = `6`, Height = `3`.

---

## Step 2 — Verify rates appear at checkout

1. Open the storefront → add **MMF-TEST-001** (qty 1) to cart
2. Go to **Checkout**
3. Enter a US shipping address (e.g. Detroit, MI 48226)
4. ✅ Shipping section shows live rates from Shippo (UPS Ground, USPS Priority, etc.)
5. Enter a different US address (e.g. New York, NY 10001)
6. ✅ Rates refresh automatically — prices change based on destination

**If no rates appear:** Check plugin is enabled on the US shipping zone
(WP Admin → WooCommerce → Settings → Shipping → Shipping zones → US zone → add Shippo method).

---

## Step 3 — Place a test order

1. Complete checkout with a test payment (Stripe test card `4242 4242 4242 4242`, exp `04/29`, CVC `424`)
2. Note the **order number** (e.g. `#4310`)
3. WP Admin → Orders → open the order → Status = **Processing** (or Paid)

---

## Step 4 — Shippo dashboard — buy a label

1. Open [apps.goshippo.com/orders](https://apps.goshippo.com/orders)
2. Find order `#4310` — it should have appeared automatically via plugin sync
3. **Package section:** Weight = `1.5 lbs`, dims = `8 × 6 × 3 in` — pre-filled ✅
   - If blank → product data wasn't set properly (go back to Step 1)
4. **Rates section:** Click "Get rates" → UPS/FedEx/USPS rates listed
5. Select a rate → click **Buy label**
6. Label PDF generated
7. **Set label metadata = order number** (e.g. `4310`) — this lets the webhook auto-match

---

## Step 5 — Verify WC order updated

1. WP Admin → Orders → `#4310`
2. Status = **Shipped** (webhook fires when label is purchased — some carriers report instantly)
   - If not yet Shipped: webhook fires on DELIVERED, not on label purchase.
     For "Shipped" on label: the Shippo plugin may update status directly.
     Check WooCommerce → Settings → Shipping → Shippo → "Update order status on label purchase".
3. Order notes: tracking number written by plugin

---

## Step 6 — Verify tracking in My Account

1. Log in as the test customer
2. My Account → Orders → `#4310` → View
3. **Shipment Tracking** section visible: carrier + tracking number + clickable link

**What populates this:**
The WC order must have tracking stored in one of these meta keys (checked in priority order):
- `_wc_shipment_tracking_items` (Advanced Shipment Tracking format)
- `_shippo_tracking_number` / `_shippo_carrier`
- `_tracking_number` / `_tracking_provider`

If tracking shows in WP admin order notes but NOT in My Account:
→ Check which meta key the plugin writes → add it to `mmf_get_order_tracking()` in `order-documents.php`
   or use the `mmf_order_tracking_entries` filter (do NOT edit the function directly).

---

## Step 7 — Test webhook (delivery)

1. In Shippo dashboard → simulate a DELIVERED event for this shipment
   (or wait for a real delivery in production)
2. WC order status → **Completed**
3. If the product had a certificate uploaded: customer receives cert email
   and My Account → Documents → certificate tab appears

**Debug:** WP Admin → WooCommerce → Status → Logs → source `mmf-shippo-webhook`

---

## Pass / Fail criteria

| Check | Pass condition |
|---|---|
| Product weight/dims in WC | Shipping tab shows non-zero values |
| Live rates at checkout | At least 1 carrier rate listed for any US address |
| Rates refresh on address change | No page reload required, prices update |
| Order appears in Shippo | Within 1–2 minutes of being placed |
| Package pre-filled in Shippo | Weight + dims auto-populated — no manual entry |
| Label purchased | PDF generated, no error |
| Tracking on WC order | Tracking number in order notes / meta |
| Tracking in My Account | "Shipment Tracking" section with carrier + link |
| Order auto-completes on delivery | Status → Completed after webhook fires |
| Cert email sent | Customer receives cert PDF (if product had cert) |

---

## Common issues and fixes

| Symptom | Cause | Fix |
|---|---|---|
| "Package info required" in Shippo | Product missing dims in WC | Set L×W×H on product Shipping tab |
| "Package weight required" | Product weight = 0 in WC | Set Weight on product Shipping tab |
| No rates at checkout | Plugin not on US zone, or API token invalid | Add Shippo method to US shipping zone; check API token |
| Order not appearing in Shippo | Plugin order sync off, or plugin not installed | Enable "Sync orders to Shippo" in plugin settings |
| Tracking not in My Account | Plugin writes a different meta key | Check `mmf_order_tracking_entries` filter |
| Webhook not firing | Wrong URL or missing signing secret | Re-check URL + secret in both WC settings and Shippo dashboard |
| Order not auto-completing | Webhook mismatch — order ID not in label metadata | Set label metadata = WC order ID when buying the label |

---

*Pairs with [`README.md`](README.md), [`../test-cases.md`](../test-cases.md).*
