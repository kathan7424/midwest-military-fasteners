# QA Guide — Midwest Military Fasteners

Everything a QA person needs to test this site: environment, test data,
tools, flows, and how to report bugs. Pairs with `test-cases.md` (the what)
— this is the how.

---

## 1. What This Site Is (context first)

B2B ecommerce for military-spec fasteners. Headless build: the customer-facing
site is **Next.js (React)**; all commerce logic (products, cart, orders,
pricing, tax, stock) lives in **WordPress/WooCommerce**. Key business rules:

- **Tax exemption**: B2B customers upload a sales-tax exemption certificate;
  admin approves; approved customers pay $0 sales tax until the cert expires.
  This is core to the business — test it hard.
- **Net 30 terms**: admin-approved customers can order on invoice (no card).
- **TaxJar** computes sales tax — it needs the FULL street address, and some
  states (Delaware, Oregon, Montana, New Hampshire) genuinely have **no sales
  tax** — $0.00 tax there is CORRECT, not a bug.
- **Certificates & spec sheets**: customers download product documents for
  items they purchased (military compliance paperwork).

## 2. Environments & Access

| Thing | Value |
|---|---|
| Frontend (dev) | http://localhost:3000 (or the staging URL you're given) |
| WordPress admin | https://dev-mmf-wp.pantheonsite.io/wp-admin |
| Stripe mode | TEST — no real charges possible |

Ask the dev for: a WP admin login, one flagged Net 30 test customer, one
approved-tax-exempt test customer.

## 3. Test Data

**Stripe test cards** (any future expiry, any CVC):
| Card | Behavior |
|---|---|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0027 6000 3184 | 3D Secure challenge |

**Addresses:**
| Purpose | Address |
|---|---|
| Taxable | 440 Burroughs St, Detroit, MI 48202 |
| Zero-tax state (correct $0) | 1209 Orange St, Wilmington, DE 19801 |

**Files for upload tests:** small PDF (valid), 6MB+ PDF (size reject),
.exe/.zip renamed (type reject), JPG/PNG (valid).

## 4. The Golden Path (run this first, every build)

1. Register new account WITH certificate upload → see pending banner
2. As admin: approve via email button OR Users → Edit
3. Login as customer → banner gone → add product → cart → checkout
4. Full Michigan address → shipping rates appear → tax shows $0 (exempt!)
5. Pay with 4242 card → success page → order in WC admin (Processing)
6. My Account → Dashboard shows the order in "Recent Orders"; click View to open Order Detail

If the golden path breaks, stop and report — everything else is secondary.

## 5. Where Things Live (for verification)

| To verify... | Look in... |
|---|---|
| Order was created | WP Admin → WooCommerce → Orders |
| Payment went through | WC order → order notes (Stripe charge id) + Stripe test dashboard |
| Tax calculated | WC order → totals; TaxJar sandbox reports |
| Cert status | WP Admin → WooCommerce → Tax Certificates (or Users → Edit) |
| Net 30 flag | WP Admin → Users → "Net 30" column |
| Emails | Use a mail-catcher/staging inbox; emails send ~10–60s AFTER the action (async by design — not a bug unless >5 min) |

## 6. Bug Report Format

```
Title: [Area] What breaks in one line
Env: dev/staging + browser + logged-in state (guest/customer/admin)
Steps: 1. ... 2. ... 3.
Expected: (quote the test case ID from test-cases.md if applicable)
Actual: what happened — include EXACT error text
Evidence: screenshot + Network tab entry (status code + response body) for API failures
```

**Always attach the Network tab response** for anything checkout/cart/API —
the response body usually names the real cause.

## 7. QA Gotchas (read before filing)

- **$0 tax in Delaware/Oregon = correct.** Only file if a MI/CA address shows $0 for a NON-exempt user.
- **Tax exemption is re-checked live on every totals calculation** — an approved cert whose expiry date passes mid-session starts charging tax on the very next cart/checkout recalculation (no re-login needed), and a re-approved cert goes back to $0 the same way. A logged-in user with an EXPIRED cert seeing $0 tax on a MI address IS a bug.
- **Settings changes take up to 5 min** on staging (ISR cache). Dev is instant.
- **Emails are async** — wait a minute before filing "email not sent".
- **Pending exemption banner has NO upload link on purpose** — customer must wait for admin review.
- **Card fields are Stripe iframes** — autofill/copy-paste behaves differently than normal inputs; that's Stripe, not us.
- **Guest checkout availability is a WC admin setting** — check WooCommerce → Settings → Accounts & Privacy before filing access bugs.
- **Checkout honors ALL WC Accounts & Privacy settings**: guest checkout (page gate), "Enable log-in during checkout" (Returning customer? notice), "Allow customers to create an account during checkout" (Create an account? checkbox for guests — sent to Store API as `create_account`, WC creates the account + sends password setup email per the "Send password setup link" setting). Settings are ISR-cached 5 min in prod — after changing a WC setting wait up to 5 minutes or redeploy; dev is always fresh.
- **Shipping form country/state lists follow WC → General → "Shipping location(s)"** — these can differ from selling locations. The primary shipping form uses shipping locations; the billing form (revealed by unchecking "Use same address for billing") uses selling locations.
- **Checkout layout clones the WC block checkout** — Contact information (email only) → Shipping address in WC field order (Country/Region first → First/Last name → Address → collapsed "+ Add apartment, suite, etc." link → City | State → ZIP Code | Phone) → "Use same address for billing" (checked by default) → Shipping options → Payment options. Billing fields only appear when the checkbox is unchecked. No asterisks on required fields — optional fields are marked "(optional)" instead (WC block convention). None of this is a missing form or styling bug.
- **Checkout prefills from the WC customer session** — logged-in users see their saved account email/phone/addresses already filled in (and rates/tax auto-calculate from them); returning guests see what they entered earlier in the session. An empty form for a logged-in customer WITH saved addresses IS a bug.
- **Shipping method section is always visible for shippable carts** — before the address is complete it says "Enter your shipping address to view shipping options." A warning about no available options means the address matches no WC shipping zone (check WC → Settings → Shipping). Free rates display as "Free". Place Order is disabled while totals recalculate.
- **Rates + tax recalculate on LOCATION alone** — country + state + city + ZIP triggers the WC/TaxJar recalculation (debounced ~1s); name, email, and street are NOT required first. If rates/tax don't appear after those four fields, that IS a bug.
- Cart badge count updates after the API response (~200ms) — a brief lag is normal; a stuck count is a bug.
- **My Account default tab is Dashboard** — /my-account opens to the Dashboard ("My Account") section, not Orders. The Dashboard shows recent orders + address cards. This is the WooCommerce standard landing page.
- **Documents tab = Tax Exemption Certificate** — not product order documents. Certifications + Spec Sheets tabs have the order-based product documents.
- **Product detail heading format** — shows `{SUB-CATEGORY} {PART-NUMBER}` (e.g. "HEX CAP SCREWS MS35307-303"). The sub-category label is normal weight/gray; the part number is bold. This is by design — not a broken breadcrumb.
- **Certificates only show after shipped/completed** — a "Processing" order's cert column shows "—". This is by design (customer receives the physical product first). Spec sheets are available immediately.
- **Checkout validation fires on Place Order click** — required fields show inline red errors below each field. Errors clear as the user types. This matches WooCommerce standard behavior. The form has `noValidate` so browser-native "Please fill out this field." tooltips never appear — if you see one, the form is missing `noValidate`.
- **On any checkout error the page scrolls to the top** — so the user sees the error toast or inline field errors. This applies to form validation failures, Stripe errors, and WC API order errors.
- **"Invalid parameter(s): billing_address, shipping_address" from WC** — root cause: WooCommerce 9+ Store API uses `additionalProperties: false` on address schemas. `shipping_address` never includes `email`; sending it causes rejection. Both proxy routes (`api/checkout` and `api/cart/customer`) now sanitize addresses through `pickWcAddress()` before forwarding to WC — only the fields WC's schema expects are sent.
- **Place Order button is always enabled** — it only disables while the order is actively being placed (`isPlacingOrder`). Shipping rate updates happen in the background and do NOT disable the button. A permanently greyed-out button outside of order placement is a bug.
- **Billing details heading** — the checkout billing section is labelled "Billing details" (WooCommerce standard). "Billing & Shipping" is the wrong label.
- **My Account panels show skeletons** while loading (not "Loading..." text) — if you see a skeleton that never resolves, the API call is failing (check Network tab).
- **Dashboard always shows address cards** — even before addresses are saved ("You have not set up this type of address yet." empty state per card). If both cards are missing after load, the `/api/account/addresses` call is failing.
- **Documents tab date picker** is a React Aria segmented picker (MM/DD/YYYY segments + calendar popover) — not a browser-native date input. Test keyboard entry (type month → Tab → day → Tab → year) and calendar click separately.
- **Payment Methods tab** shows real Stripe saved cards. Cards are fetched from Stripe via WP endpoint using the customer's `_stripe_customer_id` / `_stripe_test_customer_id` user meta. If the list is empty for a user who added cards at checkout, check that their Stripe customer ID is stored in user meta.
- **Card brand auto-detection**: `CardNumberElement` uses `showIcon: true` (Stripe built-in icon appears inside the field). A `CardBrandRow` (VISA · MC · AMEX · DISC badges) sits above the field — non-matching brands dim to 20% opacity as the user types. My Account saved cards show a colored `CardBrandIcon` badge instead of a generic credit card icon. These share the `CardBrandIcon` / `CardBrandRow` components in `src/components/shared_Ui/CardBrandIcon.tsx`.
- **Shipping zone test addresses** — Free Shipping (Michigan zone): `123 Main St, Detroit, MI 48201, US` → should show $0.00. Flat Rate (non-Michigan US): `456 Oak Ave, Columbus, OH 43001, US` → should show $12.00. Zone order matters: Michigan zone must be listed BEFORE the US zone in WC → Settings → Shipping Zones or the Michigan free-shipping rule never fires.
- **Shipping rate auto-refresh (400 errors)** — the `api/cart/customer` route was returning 400 because WC 9+ `shipping_address` schema uses `additionalProperties: false` and rejects `email`. Fixed: both `api/cart/customer` and `api/checkout` routes now run addresses through `pickWcAddress()` before forwarding to WC. If you see shipping not updating, check browser Network tab for 400s on `api/cart/customer`.
- **Checkout load failure (WP down or PHP fatal)** — when the checkout page can't load cart data from WooCommerce, it shows a red "Checkout unavailable" banner with the error message and a "Refresh page" button. It does NOT show a stuck skeleton loader. If you see an infinite skeleton on /checkout, the API proxy layer is broken — check Next.js logs and WP logs, not the frontend.
- **PHP fatal errors from WordPress** — a PHP fatal sends HTML with HTTP 200, which is technically `ok`. All WooCommerce proxy routes (`api/cart`, `api/cart/customer`, `api/checkout`) detect a non-JSON response and return HTTP 503 so the frontend correctly treats it as an error. The user sees a toast or the checkout error banner — never a silent failure.
- **My Account panel API failures** — panels that fail to load data (orders, addresses, documents, payment methods) show their error state or empty state gracefully. They do not crash or hang on a skeleton. OrderHistoryPanel, AddressesPanel, PaymentMethodsPanel all have explicit `error` state and error UI; DashboardPanel degrades to empty-state cards.
- **Spec sheet / certificate links force a real download** — they route through `/api/download?url=...` (same-origin proxy that sets `Content-Disposition: attachment`), so the browser downloads the file instead of opening it in a new tab. This applies EVERYWHERE: shop table, product detail, AND the My Account Spec Sheets / Certifications tabs + Order detail line items. The proxy ONLY accepts files hosted on the WP origin (403 for anything else) and only allowed file extensions. If a spec link opens in a tab instead of downloading, the proxy wrapper is missing.
- **Spec Sheets tab dedupes across orders** — a spec sheet is a product-level document, so the same product bought in multiple orders shows its spec sheet ONCE (under the most recent order). Certificates are per-order and are NOT deduped. Seeing the same spec sheet under two orders IS a bug.
- **Order placed → smooth redirect** — after a successful Place Order the checkout swaps to a centered "Order received — taking you to your confirmation…" spinner and then navigates to /checkout/success. Any flash of "Checkout unavailable" or the empty-cart screen between payment and the thank-you page IS a bug (the `orderComplete` guard must render before the null-cart guard).
- **Adding the same product to cart MERGES quantities (WooCommerce standard)** — adding qty 1 then qty 3 of the same product gives ONE cart row with qty 4, not two rows. Package tier pricing recalculates on the merged quantity (e.g. crossing the 3-pkg tier drops the unit price). Two rows for the same simple product IS a bug.
- **Product detail gallery** — when a product has 2+ images (main + WC gallery), thumbnails render under the main image; clicking a thumbnail swaps the main image (active thumb has an amber border). Single-image products show no thumbnail strip.
- **Product image magnifier is in-place (WC single-product hover zoom)** — hovering the main image magnifies it 2.5× INSIDE the same image box, following the cursor. No lens rectangle, no side pane (a floating pane overlapping the spec table IS a regression). Placeholder images never zoom — no zoom cursor, no zoom icon. Click still opens the lightbox, which shows a centered spinner until the full-size image loads (image fades in on load).
- **WP fetches time out at 15s** — a hung WordPress request aborts and the caller's error/fallback path runs. Pages must never sit on a skeleton indefinitely because WP stopped responding; if they do, the timeout wrapper in `wp-api.service.ts` is missing from that fetch.
- **Catalog caching windows** — product list/detail responses are ISR-cached ~5 min and category/series trees ~15 min (Next serves stale + revalidates in background, so shoppers rarely wait on WP). After a WP product/category edit, allow up to those windows on the storefront before calling data "stale".
- **Sidebar accordion is single-open** — opening a category group (e.g. "Rounded Head Screws") closes whichever group was open before, even across sections (SCREWS/NUTS/WASHERS). Clicking the open group's header closes it. Navigating to a category page auto-opens that category's group. Two groups open at once IS a bug.
- **Shop/category filter is two-speed by design** — typing filters the loaded rows instantly (client-side), then a debounced (150ms) server search replaces results with the full catalog match. A brief pending state between the two is normal; results "growing" after a pause is the server response landing, not a bug.
- **WP text is entity-decoded at render** — WordPress APIs return HTML-encoded text (`&#038;` for `&`, `&#8211;` for –). Every JSX text sink decodes via `decodeHtmlEntities()`: page titles, home category grid, search suggestions, account order item names/SKUs, checkout country/state options. `dangerouslySetInnerHTML` sinks (page content, price_html) don't need it — the browser decodes. A visible `&#0xx;` anywhere IS a bug: add the decode at that render point.
- **Catalog speed layers** — the WP categories tree is transient-cached 10 min WP-side (busted automatically on any category/product save) AND 60–120s ISR-cached Next-side. First request after both caches expire pays the full build (~1–6s on Pantheon dev); everything after is instant. If category pages are consistently slow on EVERY request, one of the cache layers is broken. Localhost dev is also inherently slower (on-demand compile) — judge speed on the production build. Dev mode also has a 30s in-memory WP cache (dies with the dev server) so repeat navigation is fast without persistent staleness.
- **Catalog pagination is CLIENT-SIDE** — clicking a page number/Prev/Next fetches from `/api/catalog/products` and updates the table in place (URL updates via pushState, page scrolls to top). No full page navigation. Repeat page visits within ~30s are near-instant (browser + server cache). Middle-click/ctrl-click on a page number still opens the real URL. A full page reload on pagination click IS a regression.
- **Sidebar series/category links are prefetched** — links in the open accordion group pre-render their pages, so clicks land near-instantly. First click on a never-visited series may still show the skeleton briefly (data fetch), which is expected.
- **KNOWN ISSUE until next WP deploy: `/spec-parts/v1/products` list endpoint 500s on Pantheon** ("Object of class WP_REST_Request could not be converted to string" — stale deployed theme). The frontend silently falls back to a slower wp/v2-based path, so the catalog WORKS but cold queries take ~2s. After the theme deploy, verify the endpoint returns 200 and cold queries drop to well under 1s.
- **Gallery images added in WC admin take up to ~60s to appear** — the product detail fetch is ISR-cached 60s. Add images → wait a minute → reload. Filing "gallery not showing" within a minute of adding images is premature; after 2+ minutes it's a real bug.
- **Detail page shows TWO descriptions by design** — under the title: the product's LONG description (WC "Product description" editor); in the spec table's DESCRIPTION row: the SHORT description (WC "Product short description"). When only one is filled in WC, both spots fall back to it — identical text in both places is only a bug if BOTH fields are filled and different in WP admin.
- **Qty inputs are BLANK by default (no pre-filled 1)** — shop table rows and the product detail page show an empty box with "QTY" placeholder. Clicking "Add to Order" with a blank box shows "Please enter a quantity." and adds nothing. After a successful add the box resets to blank. A pre-filled "1" IS a bug. (The cart page still shows the actual line quantity — that's correct.)
- **Shop hero (title/description/image) comes from the WP Shop page** — edit it in WP admin → Pages → Shop (title, content, featured image) and click UPDATE (unsaved edits don't reach the API). Empty fields fall back: title → "Product Catalog", image → first product's image, description → hidden. Allow up to 60s (ISR cache) for changes to appear.
- **WP frontend is guest-blocked (headless standard)** — visiting the WordPress URL directly (e.g. dev-mmf-wp.pantheonsite.io) as a guest redirects to the storefront (path preserved) when "Headless Frontend URL" is set in WP Settings → General, otherwise shows a plain "API backend" notice. wp-admin, wp-login, REST API, AJAX, and cron are untouched; logged-in editors/admins still see the WP frontend (previews). Seeing the WP theme as a guest IS a bug after deploy.
- **Shippo is plugin-only; the frontend is already compatible** — checkout renders whatever shipping rates WooCommerce returns, so Shippo live rates appear automatically once the plugin is active (client credentials pending). Order tracking shows in My Account order detail as soon as the plugin writes a tracking number to the order. Don't file "no UPS/FedEx rates" until the plugin is installed. Full module doc: shippo-guide.md.
- **"Shipment Tracking" section is hidden until tracking exists** — a processing order with no label yet shows no tracking section. That's by design, not a missing feature.
- **Guests see ONLY the 1 PKG price** — the 3/5/10 PKG tier columns (shop/category tables) and tier rows (product detail spec table) require login. Log out to test the guest view; log in and the tiers appear. Exception: the loading skeleton briefly shows generic column headers (it can't know auth state) — only the loaded table matters. Tier prices visible to a logged-out user IS a bug.
- **Guests are CHARGED the 1 PKG price at any quantity** — tier discounts are a logged-in benefit. A guest adding 5 packages pays 5 × the 1 PKG price (matching what they were shown); a logged-in customer adding 5 packages gets the 5-pkg tier price. A guest cart/checkout total showing a tier discount IS a bug; so is a logged-in customer NOT getting the tier price. (functions.php `woocommerce_before_calculate_totals` — needs WP deploy.)
- **Certificate upload REQUIRES an expiration date — everywhere** — register page, My Account → Documents tab, and the cart/checkout exemption banner all reject a certificate without a future expiry date (client validation + server 400). Registering with a certificate but no expiry must show "Expiration date is required when uploading a certificate." Registering with NO certificate needs no expiry. A cert accepted without expiry IS a bug.
- **All tax-exemption expiry fields use the same React Aria date picker** — segmented MM/DD/YYYY input + calendar popover (DatePickerField), on register, Documents tab, and the cart banner. A native browser date input or the old button-style picker anywhere is a regression.
- **Tax Certificates admin quick-edit status select is COLOR-TINTED** — amber = Pending, green = Approved, red = Rejected, plain = None; the tint updates live when you change the selection (tax-admin.js). The table is full-width; quick-edit controls sit in one row (date + status + Save). The table has a horizontal scroll container so it never clips on narrow viewports — drag left/right if Quick Edit column seems hidden. A stale look after deploy = hard-refresh (CSS/JS are version-busted at 2.1.2).
- **Guest cart requires the WP functions.php cache fix to be deployed** — Pantheon's Varnish cached the WC Store API cart endpoint (`/wc/store/v1/cart`) with `Cache-Control: public, max-age=604800` without varying on Cart-Token, so all guests saw the same stale empty cart. Two-layer fix: the Next.js proxy appends `?_nc=<timestamp>` to every cart GET to bypass Varnish immediately; the `functions.php` `rest_post_dispatch` filter adds `Cache-Control: no-store` server-side once deployed to Pantheon. If the WordPress deploy hasn't happened yet and guest cart still appears empty, confirm the Next.js proxy is running the latest build.
- **Guest checkout setting controls cart access** — WooCommerce → Settings → Accounts & Privacy → "Allow customers to place orders without an account." When enabled: guests add items, see cart, and check out freely. When disabled: guests can add items to cart but are prompted to log in or register at checkout (not at cart). The cart page always shows items either way — the gate is at checkout, not cart. A guest seeing an empty cart IS a bug; a guest being asked to log in at checkout when guest checkout is off is correct behavior.

## 8. Regression Scope by Change Type

| When devs change... | Re-run |
|---|---|
| Anything auth/login | TC-AUTH, SEC-02/03/05 |
| Cart/checkout | TC-CART, TC-CHK, TC-CHK-VAL, TC-COUPON, golden path |
| Tax exemption | TC-TAX, SEC-04, golden path steps 1–4 |
| WP settings plumbing | TC-SET |
| Any API route | TC-SEC full |
| Product detail page | TC-PDP full |
| CSV import | TC-IMP full |
| My Account panels | TC-ACC full (ACC-01 through ACC-28) |
| Account edit/password | TC-ACC (ACC-21 through ACC-24), SEC-06 |
| Order documents/certs | TC-ACC (ACC-11 through ACC-12, ACC-28) |
| Tax exemption / Documents tab | TC-ACC (ACC-13 through ACC-17), TC-DOC, TC-TAX |
| Payment methods | TC-PM full |
| Styling only | Golden path visual pass + mobile (375px) spot check |

## 9. Browser / Device Matrix

- Chrome (primary), Firefox, Safari (macOS + iOS), Edge
- Mobile: 375px (iPhone SE class) and 768px (tablet) — checkout and My Account
  tables must scroll horizontally inside their container, never break layout.
- Dark mode is not supported by design — no need to test.
