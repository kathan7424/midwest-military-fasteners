# Net 30 — Purchase Order Terms Guide

Midwest Military Fasteners headless store — complete reference for the Net 30
payment flow: what it is, how to enable it for customers, how orders work, and
how to fulfil them.

---

## 1. What is Net 30?

Net 30 lets an approved business customer place an order **without paying at
checkout**. An invoice ships with the goods and payment is due within 30 days.

**Key points:**
- No money is collected at checkout — no card, no Stripe.
- Admin manually ships the order and manages payment collection.
- Only customers explicitly approved by admin can see or use this option.
- Guests can never use Net 30 — login is required.

---

## 2. How it Works (Architecture)

```
Customer at checkout
        │
        ▼
WooCommerce Store API  ← mmf_filter_net30_gateway runs here
  (checks mmf_net30_eligible user meta)
        │
        ├── eligible? YES  →  gateway list includes "cod" (Net 30)
        └── eligible? NO   →  gateway list omits "cod" (only Stripe visible)
```

```
Customer selects "Net 30 — Purchase Order Terms" → clicks Place Order
        │
        ▼
Next.js sends:  POST /wp-json/wc/store/v1/checkout
                { payment_method: "cod", payment_data: [] }
        │
        ▼
WooCommerce COD gateway creates order
  status: "processing"  (custom hook sets this — see §6)
  payment method: "Cash on Delivery" (WC internal)
  label shown to customer: "Net 30 — Purchase Order Terms"
        │
        ▼
Customer sees success page: "Net 30 — Purchase Order" label
Admin fulfils and ships the order via Shippo (see §5)
Customer pays invoice within 30 days
Admin marks order "Completed"
```

> **Why COD?** WooCommerce has no built-in "invoice" gateway. COD is the
> standard method to repurpose — it creates an order with no payment capture
> and the WC Store API supports it natively.

---

## 3. WooCommerce Plugin Settings

Before any of this works, the COD gateway must be correctly configured:

1. **WP Admin → WooCommerce → Settings → Payments**
2. Find **"Cash on Delivery"** → click **Manage**
3. Set these fields:

| Field | Value |
|---|---|
| Enable/Disable | ☑ Enable Cash on Delivery |
| Title | `Net 30 — Purchase Order Terms` |
| Description | `Your order will be placed on Net 30 payment terms. An invoice will be included with your order — payment is due within 30 days.` |
| Instructions | (same as description, or leave blank) |

> The title and description from WC settings are what WC stores on each order —
> the Next.js frontend shows its own hardcoded label, but the WP admin order
> detail always reflects the WC settings value.

---

## 4. Enabling / Disabling a Customer for Net 30

There are **two ways** to manage eligibility — both update the same user meta
key (`mmf_net30_eligible`).

### Method A — Users List (fastest, no page reload)

1. **WP Admin → Users**
2. Find the customer in the table
3. Look at the **"Net 30"** column
   - Grey **"Disabled"** button → customer cannot use Net 30
   - Green **"✓ Eligible"** button → customer can use Net 30
4. Click the button to toggle — it saves instantly via AJAX

### Method B — User Profile (detailed view)

1. **WP Admin → Users → [click customer name]**
2. Scroll down to the **"Net 30 Payment Terms"** section
3. Check or uncheck **"Net 30 eligible"**
4. Click **"Update User"** to save

### Who can manage this?

Only users with the `manage_woocommerce` capability (shop managers and
administrators).

---

## 5. Admin Order Fulfilment Workflow

This is the day-to-day flow after a Net 30 order is placed:

```
1. Order placed by customer → lands in WP Admin → Orders as "Processing"

2. Admin opens the order
   → Verify billing address, shipping address, items

3. Admin creates shipping label in Shippo
   → WP Admin → Orders → [open order] → Shippo "Create Label" section
   → Select carrier, service, package → Generate label
   → Label PDF downloads automatically

4. Admin ships the physical goods with the label
   → Include the invoice (printable from WP order detail page)

5. Admin updates order status
   → While waiting for payment: leave as "Processing" or change to "On Hold"
   → When payment received (within 30 days): change to "Completed"

6. If customer has not paid after 30 days
   → Follow up manually (phone/email)
   → WooCommerce has no automated dunning — this is manual
```

> **Shippo works because the order is "Processing"** — the custom hook in
> `wordpress/inc/net30.php` forces Net 30 orders to "processing" on creation.
> Without this, COD would default to "on-hold" and Shippo would not show the
> "Create Label" option.

---

## 6. Technical Implementation Reference

### Files

| File | Purpose |
|---|---|
| `wordpress/inc/net30.php` | All Net 30 server-side logic |
| `src/components/pages/Checkout/CheckoutPageView.tsx` | Frontend detection + rendering |
| `src/app/(website)/checkout/success/page.tsx` | Success page Net 30 label |

### net30.php — Hooks at a Glance

| Hook | Function | What it does |
|---|---|---|
| `woocommerce_available_payment_gateways` (priority 20) | `mmf_filter_net30_gateway` | Hides `cod` from non-eligible customers in both classic and Store API checkout |
| `woocommerce_checkout_order_created` (priority 10) | `mmf_net30_set_processing_status` | Forces Net 30 orders to `processing` so Shippo can create labels |
| `show_user_profile` / `edit_user_profile` | `mmf_render_net30_user_field` | Adds checkbox section on user profile edit page |
| `personal_options_update` / `edit_user_profile_update` | `mmf_save_net30_user_field` | Saves checkbox on profile save |
| `manage_users_columns` | `mmf_add_net30_users_column` | Adds "Net 30" column to Users list |
| `manage_users_custom_column` | `mmf_render_net30_users_column` | Renders toggle button in that column |
| `admin_footer-users.php` | `mmf_net30_users_toggle_script` | Inlines AJAX JS for the toggle button |
| `wp_ajax_mmf_toggle_net30` | `mmf_ajax_toggle_net30` | Handles the AJAX toggle request |

### User Meta Key

```
mmf_net30_eligible
  Value 'yes'  → customer sees Net 30 at checkout
  Value ''     → customer does not see Net 30
```

### Frontend Detection (CheckoutPageView.tsx)

```ts
const isNet30 = activeGateway === "cod";
```

When `isNet30` is true:
- Stripe card fields are hidden
- `payment_method: "cod"` sent to WC
- `payment_data: []` (empty — no Stripe token)
- Success URL includes `method=net30`

---

## 7. Order Statuses Reference

| WC Status | Meaning for Net 30 |
|---|---|
| `processing` | Order placed, awaiting fulfilment — **Shippo label creation available** |
| `on-hold` | Payment pending (avoid for Net 30 — Shippo does not show label button) |
| `completed` | Goods shipped AND payment received |
| `cancelled` | Order cancelled before fulfilment |

---

## 8. Troubleshooting

### Customer says they can't see "Net 30" option at checkout

- Confirm they are logged in (guests are always excluded)
- Check **WP Admin → Users → Net 30 column** — must be green "✓ Eligible"
- If grey: click to enable, then ask customer to reload the checkout page

### Shippo "Create Label" button is missing on the order

- Check the order status — it must be **"Processing"**
- If status is "On Hold", change it to "Processing" and save
- Refresh the order page

### Net 30 option appears for everyone (not gated)

- Check that `net30.php` is loaded in `functions.php`
- Check `woocommerce_available_payment_gateways` filter is running:
  ```php
  add_filter( 'woocommerce_available_payment_gateways', 'mmf_filter_net30_gateway', 20 );
  ```
- Verify the user meta is absent (`mmf_net30_eligible` not set) for ineligible users

### COD gateway not appearing in WooCommerce Payments list

- Go to **WC → Settings → Payments** and confirm "Cash on Delivery" is enabled
- If the "Net 30" column does not appear in the Users list, the theme may not
  have loaded net30.php — check `functions.php` for:
  ```php
  require_once get_template_directory() . '/inc/net30.php';
  ```

---

## 9. Quick Reference Card

```
Enable Net 30 for a customer:
  WP Admin → Users → find customer → Net 30 column → click "Disabled" → turns green

Fulfil a Net 30 order:
  WP Admin → Orders → open order → Shippo Create Label → ship → mark Completed when paid

Net 30 order status on creation: "Processing"
Payment gateway ID in WooCommerce: "cod"
User meta key: mmf_net30_eligible = 'yes'
30-day tracking: manual (WC has no built-in dunning)
```
