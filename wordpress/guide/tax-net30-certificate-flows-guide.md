# Tax Exemption, Net 30 & Product Certificates — 3 Independent Flows

These are **three separate systems** that share some data (a Net 30 toggle can
be auto-set by tax exemption approval) but have **independent triggers**.
Confusing them is the #1 source of "why didn't the email fire" questions —
this doc draws the line clearly for each one: what triggers it, is it a cron
or an event, and exactly which function sends which email.

| Flow | Trigger type | Lives in |
|---|---|---|
| A. Tax Exemption Certificate | Event (upload / admin action) **+** Cron (expiry reminders) | `inc/tax-exemption.php`, `inc/tax-exemption-admin.php` |
| B. Net 30 Terms | Event only (manual toggle, or auto-set by Flow A) | `inc/net30.php` |
| C. Product Certificate (SOW certs) | Event only (order status change) | `inc/order-documents.php` |

---

## Flow A — Tax Exemption Certificate

Whole flow, in order:

```
Customer uploads cert (register OR My Account)
   │
   ▼
mmf_tax_exemption_status = "pending"  (user meta)
   │
   ▼
mmf_queue_tax_cert_admin_email()  →  wp_schedule_single_event(+10s)
   │                                  (background — doesn't slow the request)
   ▼
[EVENT] mmf_send_tax_cert_admin_email()
   →  emails admin_email: customer info + cert link + APPROVE/REJECT buttons
   →  buttons are HMAC-signed URLs, work without WP login, expire in 14 days
   │
   ▼
Admin clicks APPROVE / REJECT  (email button, OR dashboard, OR Users→Edit, OR REST)
   │
   ▼
[EVENT] mmf_send_tax_cert_customer_email( $user_id, $status )
   →  emails the customer: "approved" or "rejected", branded template
   →  ALSO: if approved → mmf_net30_eligible = 'yes'  (feeds Flow B)
   →  ALSO: mmf_sync_customer_tax_exempt_flag_on_id() → WC_Customer::set_is_vat_exempt()
   │
   ▼
[CRON — daily] mmf_tax_exemption_daily_reminders
   →  mmf_send_tax_exemption_reminders() checks every approved cert's expiry:
        ≤ 3 days left   → URGENT reminder email  (flag: mmf_tax_reminder_expiring_3day)
        ≤ 30 days left  → "expiring soon" email   (flag: mmf_tax_reminder_expiring)
        < 0 days left   → "expired" email         (flag: mmf_tax_reminder_expired)
   →  each flag stores the expiry date it already emailed for — so the
      SAME expiry date never re-sends the same reminder twice, but a NEW
      expiry date (after renewal) resets the flag naturally
```

### Every email in Flow A

| # | Function | Fires when | To | Cron or event |
|---|---|---|---|---|
| 1 | `mmf_send_tax_cert_admin_email()` | Cert uploaded (register or My Account) | Admin | **Event** — queued 10s after upload via `wp_schedule_single_event` (one-time, not recurring) |
| 2 | `mmf_send_tax_cert_customer_email()` | Admin approves/rejects — any of the 6 admin paths | Customer | **Event** — fires inline the moment the admin action completes |
| 3 | `mmf_send_tax_exemption_reminders()` | Daily cron tick, cert within 3 days of expiry | Customer | **Cron** — recurring |
| 4 | `mmf_send_tax_exemption_reminders()` | Daily cron tick, cert within 30 days of expiry | Customer | **Cron** — recurring |
| 5 | `mmf_send_tax_exemption_reminders()` | Daily cron tick, cert already expired | Customer | **Cron** — recurring |

### The 6 admin approval paths (all send email #2 + auto-enable Net 30)

1. One-click **APPROVE**/**REJECT** button in the admin review email
2. Tax Certificates dashboard quick-approve/reject button (GET link)
3. Tax Certificates dashboard full-edit form (Status dropdown → Save)
4. Tax Certificates dashboard quick-edit row (inline table save)
5. PATCH REST endpoint (`/custom/v1/tax-exemption/certificates/{id}`)
6. WP Admin → Users → [customer] → Edit → Status dropdown → Update User

Every path re-checks `old_status !== new_status` before emailing, so re-saving
the same status twice never double-sends.

### How the cron actually runs

```php
add_action( 'init', 'mmf_schedule_tax_exemption_reminders' );
add_action( 'mmf_tax_exemption_daily_reminders', 'mmf_send_tax_exemption_reminders' );

function mmf_schedule_tax_exemption_reminders(): void {
    if ( ! wp_next_scheduled( 'mmf_tax_exemption_daily_reminders' ) ) {
        wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'mmf_tax_exemption_daily_reminders' );
    }
}
```

This is **WP-Cron**, not a real system cron job. WordPress checks "is anything
due?" on every page load and runs it inline if so. That means:

- On a busy production site, "daily" fires close enough to daily — every page
  view is a chance to trigger it.
- On a **quiet dev/staging site with no visitors**, the daily check can sit
  for hours (or until someone loads any page) before it actually runs. This
  is normal WP-Cron behavior, not a bug — if the reminder "isn't firing," the
  first thing to check is whether anyone has loaded a page since it became due.
- To force it immediately for testing: visit `/wp-cron.php?doing_wp_cron` directly,
  or run `wp cron event run mmf_tax_exemption_daily_reminders` if WP-CLI is available.
- Each of the 3 reminder types has its **own** user-meta flag
  (`mmf_tax_reminder_expiring_3day` / `mmf_tax_reminder_expiring` /
  `mmf_tax_reminder_expired`), storing the expiry date it already emailed for.
  All three can fire independently for the same certificate as its expiry
  date gets closer — that's intentional, not a duplicate-email bug.

---

## Flow B — Net 30 Terms

**No cron involved anywhere in this flow.** It's a single user-meta flag
(`mmf_net30_eligible = 'yes'`) checked live at checkout.

```
Set by:
  (a) Admin manually — Users list toggle button, OR Users→Edit checkbox
  (b) AUTOMATICALLY — Flow A step "Admin approves tax exemption"
      (update_user_meta( $user_id, 'mmf_net30_eligible', 'yes' ))
   │
   ▼
[EVENT] woocommerce_available_payment_gateways filter (priority 20)
   →  mmf_filter_net30_gateway() checks the flag live on every checkout load
   →  eligible customer sees Credit Card + Net 30 radio options
   →  ineligible customer sees Credit Card only
```

No email is sent specifically for a Net 30 toggle — the customer finds out
by seeing the option at their next checkout. If it was auto-enabled by tax
exemption approval, the tax-approval email (Flow A, email #2) is what tells
them, indirectly, that tax-exempt pricing now applies — Net 30 availability
is a silent side effect they'll notice at checkout.

**Rejecting a certificate never disables** an existing Net 30 eligibility —
the two are linked one-directionally (approval → grants), not two-way synced.

---

## Flow C — Product Certificate (SOW certification documents)

Completely separate from Flow A. This is a **per-product** certificate
(mfr certificate of conformance, material/process cert, test report) attached
to a physical product via `_certificate_file_url`, delivered only if the
customer opted in at checkout for that specific line item.

```
Admin sets _certificate_file_url on a product (CSV import CERTIFICATE column,
   or Product edit screen "Certificate" field)
   │
   ▼
Customer checks "Include certificate" opt-in for that item at checkout
   →  order line item meta: _mmf_cert_opted_in = '1'
   →  order line item meta: _mmf_certificate_file_url = (copied from product)
   │
   ▼
Order ships / completes  (admin manually, OR Shippo webhook auto-completes on DELIVERED)
   │
   ▼
[EVENT] woocommerce_order_status_changed  (fires on EVERY status change, not just this one)
   │
   ▼
mmf_send_certificates_ready_email( $order_id, $old_status, $new_status, $order )
   →  only proceeds if $new_status is "completed" or "shipped"
   →  only proceeds if $old_status was NOT already completed/shipped
        (blocks completed → processing → completed re-fire)
   →  only proceeds if order meta _mmf_cert_email_sent is NOT already '1'
        (hard guard — survives any status cycling, covers both the admin
        path and the Shippo webhook path identically)
   →  collects certificate files ONLY from line items with _mmf_cert_opted_in = '1'
        (SOW rule: no opt-in → no certificate, ever — even if the product has one)
   →  if there's at least one cert file: emails the customer a branded
        "Your product certificates are ready" email with per-item download links
   →  marks _mmf_cert_email_sent = '1' ONLY on successful send (a mail-server
        hiccup still allows a retry on the next eligible status change)
```

### No cron in this flow at all

Everything here is triggered by the single WooCommerce core hook
`woocommerce_order_status_changed`. It doesn't matter whether the order
reaches "completed" because:

- an admin manually changed the dropdown in wp-admin, or
- the **Shippo webhook** auto-completed it on a `DELIVERED` event
  ([shippo-webhook.php](../inc/shippo-webhook.php) — see the Shippo guide)

— both paths fire the exact same WC hook, so `mmf_send_certificates_ready_email()`
behaves identically either way. This is also why the guide's Shippo webhook
doc calls this out explicitly: it's the single trigger point by design.

### Why the certificate + email sometimes silently doesn't appear

Three independent pieces of data are required, and if ANY is missing the
email silently doesn't send (by design — never send a broken/empty cert email):

1. Product must have `_certificate_file_url` set (admin — Product edit screen
   or CSV import CERTIFICATE column)
2. The specific order line item must have `_mmf_cert_opted_in = '1'`
   (customer had to check the opt-in box for that item at checkout)
3. Order must actually reach `completed` or `shipped` status

Missing any one of the three = no email, no error, no log entry currently.
If you need to debug why a specific order didn't get the email, check these
three conditions on that order/product directly.

### Known failure mode — the opt-in checkbox never reaches WordPress at all

Condition 2 above (`_mmf_cert_opted_in = '1'`) depends on the checkout
extensions payload (`extensions.mmf_cert.cert_opted_in`) reaching WordPress
and being read by `woocommerce_store_api_register_update_callback()`
([cart.php](../inc/cart.php)). That Store API helper only exists in newer
WooCommerce Blocks releases. On an older/mismatched version,
`function_exists()` silently skips registering it — **with no error anywhere**
— and the order still places successfully. The customer checks the box,
places the order, gets no error, but nothing is ever stamped on the line
item: no Certificate column entry, no email, ever.

Fix in place: `mmf_cert_capture_checkout_extensions_fallback()`
([cart.php](../inc/cart.php)) hooks `rest_request_before_callbacks` on the
`/wc/store/v1/checkout` route and reads `extensions.mmf_cert.cert_opted_in`
directly off the raw REST request, independent of whether the newer Store
API registration helper is available. This runs as a defense-in-depth layer
alongside the original registration — whichever one actually works on the
installed WC version, the opt-in still gets captured.

### Product Certifications admin dashboard

**WooCommerce → Product Certifications** ([certificate-admin.php](../inc/certificate-admin.php))
— read-only visibility page, no actions. Lists every order line item with a
recorded opt-in (most recent 200), each tagged with one of:

| State | Meaning |
|---|---|
| **Sent** | `_mmf_cert_email_sent = '1'` — the customer has the email |
| **Awaiting fulfillment** | Order hasn't reached Completed/Shipped yet — normal, will send automatically |
| **Not sent — needs a look** | Order IS Completed/Shipped but the email never went out — check WooCommerce → Status → Logs or wp_mail() deliverability |
| **Missing certificate file** | Customer opted in, but the product's `_certificate_file_url` was removed after the order was placed |

This page answers "did the cert flow actually work for this order" without
needing to open the order and check line item meta by hand.

---

## Quick answers

**"Does uploading a cert at registration send an email?"**
Yes — to the admin, ~10 seconds later, with Approve/Reject buttons. Event, not cron.

**"When admin approves, does the customer get notified?"**
Yes, from any of the 6 approval paths. Event, not cron. Net 30 is also
silently auto-enabled in the same action.

**"How does the expiry reminder actually decide when to fire?"**
Daily WP-Cron tick → checks every approved cert's expiry date → sends one of
3 tiered reminder emails (3-day / 30-day / expired) based on days remaining,
each with its own de-dupe flag so the same reminder for the same expiry date
never repeats.

**"Does the product certificate flow use cron?"**
No — it's 100% event-driven off `woocommerce_order_status_changed`, whether
that status change came from an admin click or the Shippo delivery webhook.

**"Are Net 30 and Tax Exemption the same system?"**
No — Net 30 is its own flag, checked only at checkout gateway-filtering time.
Tax exemption approval happens to auto-set it as a side effect, but you can
also toggle Net 30 completely independently of any certificate.

---

*Pairs with [test-cases.md](test-cases.md) (TC-TAX, TC-NET30), [shippo-guide.md](shippo-guide.md) §8
(delivery webhook — shared trigger with Flow C), [gravity-forms-email-templates.md](gravity-forms-email-templates.md)
(registration-time admin/user notifications, separate from Flow A's admin review email).*
