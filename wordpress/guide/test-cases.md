# Test Cases — Midwest Military Fasteners

Manual + automated test cases for every built feature. Status column is for
the QA run; expected results are the acceptance criteria.

Test env: dev site (localhost:3000 → dev-mmf-wp.pantheonsite.io).
Stripe test card: `4242 4242 4242 4242` (any future expiry/CVC). Decline card: `4000 0000 0000 0002`. 3DS card: `4000 0027 6000 3184`.

---

## TC-PDP — Product Detail Page

| ID | Steps | Expected |
|---|---|---|
| PDP-01 | Open any product page (e.g. /product/ms35307-303) | Heading shows `{SUB-CATEGORY} {PART-NUMBER}` (e.g. "HEX CAP SCREWS MS35307-303"); "Part" prefix is gone |
| PDP-02 | Heading sub-category label | Text before the bold part number is normal weight (not bold), mid-gray; part number is bold uppercase |
| PDP-03 | Description paragraph | Full product description from WC post_content shown below the heading |
| PDP-04 | Spec table DESCRIPTION row | Same description text shown in the spec table Description row |
| PDP-05 | After re-import with CSV | product page description matches DESCRIPTION column value from CSV |
| PDP-06 | Product with 2+ images (main + WC gallery) | Thumbnail strip renders under main image; clicking a thumb swaps the main image; active thumb has amber border |
| PDP-07 | Product with 1 image only | No thumbnail strip — layout identical to before gallery feature |
| PDP-08 | Click "Download Spec Sheet" (detail page) or "Download" (shop table) | File DOWNLOADS (no new tab); filename matches the WP file name |
| PDP-09 | Request `/api/download?url=https://evil.example.com/x.pdf` directly | 403 — proxy only allows the WP origin |
| PDP-10 | Shop page: add same product twice (qty 1, then qty 3) | Mini-cart shows ONE row with qty 4 (WC merges); unit price recalculates to the matching package tier |
| PDP-11 | Sidebar: open "Hex Cap Screws", then open "Cap Nuts" (different section) | "Hex Cap Screws" closes automatically — only ONE group open at a time across the whole sidebar |
| PDP-12 | Sidebar: click the currently open group's header | Group closes; no group is open |
| PDP-13 | Navigate to a category page (e.g. /product-category/screws/hex-cap-screws) | That category's sidebar group is open on load; all others closed |
| PDP-14 | Add gallery images to a product in WC admin, then open its detail page | Thumbnails appear (allow up to ~5 min — product fetch cache); no code change needed |
| PDP-15 | Product with distinct long + short descriptions | Under the title: LONG description; spec table DESCRIPTION row: SHORT description |
| PDP-16 | Open shop page / product detail | Every qty input is BLANK (placeholder "QTY") — no pre-filled 1 |
| PDP-17 | Click "Add to Order" with a blank qty input | Error toast "Please enter a quantity." — nothing added to cart |
| PDP-18 | Enter qty, click "Add to Order", item adds | Qty input resets to blank after a successful add |
| PDP-19 | Edit WP admin → Pages → Shop (title/content/featured image), Update, wait ~5 min, reload /shop | Hero shows the WP title, content, and featured image; empty fields fall back (title "Product Catalog", first product image) |
| PDP-20 | As a guest, open the WordPress URL directly (site root or any WP page) | Redirects to the storefront with path preserved (Frontend URL set) OR shows plain "API backend" notice (not set) — never the WP theme |
| PDP-21 | As a guest, open `{wp}/wp-login.php` and `{wp}/wp-json/` | Both still work — login page loads, REST responds (redirect must not touch admin/API traffic) |
| PDP-22 | As a GUEST, open /shop, a category page, and a product detail | Only the 1 PKG price shows — no 3/5/10 PKG columns (tables) or rows (spec table) |
| PDP-23 | Log in, revisit the same pages | 3/5/10 PKG tier prices appear everywhere |
| PDP-24 | Shop/category page: click a pagination number, Prev, or Next | Table swaps in place (dims briefly, scrolls to top) — NO full page reload; URL `?page=` updates; browser back keeps the page usable |
| PDP-25 | Click page 3, then click page 3 again within ~30s | Second visit is near-instant (cached) |
| PDP-26 | Middle-click / ctrl-click a pagination number | Opens the correct `?page=N` URL in a new tab |
| PDP-27 | Open a sidebar accordion group, hover briefly, click a series link | Navigation feels near-instant (links prefetch); first-ever visit may flash the skeleton briefly |
| PDP-28 | Hover the main product image (real photo) | Image magnifies 2.5× INSIDE the same box, following the cursor; leaving the image smoothly zooms back out; NO floating pane over other content |
| PDP-29 | Product with a broken/missing image (placeholder art) | No hover zoom at all — default cursor, no zoom icon; clicking still opens the lightbox with the placeholder |
| PDP-30 | WP page title containing `&` (e.g. "Shipping & Returns") | Renders "Shipping & Returns" — never the raw `&#038;` entity; same for category names, search suggestions, order item names, and checkout state/country dropdowns |
| PDP-31 | Open the lightbox (click main image), then Prev/Next between images | White spinner shows centered until the full-size image loads, then image fades in; no blank dark frame while loading |
| PDP-32 | WP backend hangs (unreachable/very slow) | Pages fail over to their error/fallback path within ~15s — never an indefinite skeleton (WP fetches have a 15s timeout) |

## TC-IMP — CSV Import

| ID | Steps | Expected |
|---|---|---|
| IMP-01 | Import CSV with DESCRIPTION value | Description saved as both WC full description (post_content) AND short description (post_excerpt) |
| IMP-02 | Preview CSV before import | Per-row report shows prices, images, docs — no import actually runs |
| IMP-03 | Import duplicate SKU with "Update existing" unchecked | Row skipped; existing product unchanged |
| IMP-04 | Import duplicate SKU with "Update existing" checked | Existing product updated with new values |
| IMP-05 | SPEC SHEET column blank, `{SKU}-spec.pdf` exists in product-specs/ | Auto-resolved; spec download link appears on product page |

## TC-AUTH — Authentication

| ID | Steps | Expected |
|---|---|---|
| AUTH-01 | Register with valid data + tax certificate (PDF) + future expiry | Account created; logged in; cert goes to "pending"; admin gets review email with APPROVE/REJECT buttons |
| AUTH-02 | Register with an email that already exists | Inline error, no account created, no info about the existing account beyond "exists" |
| AUTH-03 | Register with 20MB file / .exe file as certificate | Rejected client-side AND server-side (400) — registration not created |
| AUTH-04 | Login with wrong password ×2, then correct | Errors are generic ("Invalid email or password"); success on correct |
| AUTH-05 | Login with `?redirect=/checkout` | Lands on /checkout after login |
| AUTH-06 | Login with `?redirect=//evil.com` | Lands on `/` (open-redirect blocked) |
| AUTH-07 | Logout | Session + WC cart cookies cleared; /my-account redirects to login |
| AUTH-08 | Direct GET `/my-account` while logged out | 307 → /login?redirect=/my-account |
| AUTH-09 | Forgot password with unknown email | Same generic success message as known email (no enumeration) |
| AUTH-10 | Register with certificate uploaded but expiry date EMPTY | Inline error "Expiration date is required when uploading a certificate." — no account created. Bypassing the client (API POST) → 400 |
| AUTH-11 | Register with certificate + PAST expiry date | Rejected client-side (future-date rule) and server-side (400 "must be a future date") |
| AUTH-12 | Register with NO certificate and NO expiry | Succeeds — expiry only required when a certificate is attached |
| AUTH-13 | Register page expiry field | Same segmented MM/DD/YYYY React Aria picker as Documents tab (typing + calendar popover) — not a native date input |

## TC-CART — Cart

| ID | Steps | Expected |
|---|---|---|
| CART-01 | Add product to cart from product table | Toast; count in header updates |
| CART-02 | Change quantity with +/- | Line + totals recalc; "Cart updated." toast (single toast on rapid clicks) |
| CART-03 | Set quantity above available stock | Clamped to stock max (WC quantity limits); message |
| CART-04 | API: POST /api/cart with quantity 999999999 | Clamped to 9999 |
| CART-05 | Remove item | Row disappears, totals recalc |
| CART-06 | Cart persists across reload / login | Same items after refresh; guest cart merges per WC session rules |
| CART-07 | As a GUEST (incognito): add product → navigate to /cart | Items appear on cart page (not "Your cart is empty") — guest cart is session-persisted via Cart-Token cookie |
| CART-08 | As a GUEST with WC guest checkout OFF: add to cart → /cart → proceed to checkout | Cart shows items; /checkout redirects to login |
| CART-09 | As a GUEST: add 5 packages of a product with 5-pkg tier pricing | Cart line = 5 × the 1 PKG price (NO tier discount — guests pay the price they were shown) |
| CART-10 | Log in, add 5 packages of the same tiered product | Cart line = 5 × the 5-pkg tier price (tier discount applies to logged-in customers) |

## TC-CHK — Checkout

| ID | Steps | Expected |
|---|---|---|
| CHK-01 | Guest visits /checkout with WC "guest checkout" ON | Page loads (no login redirect); "Returning customer? Click here to login" notice shows |
| CHK-02 | WC Accounts & Privacy → guest checkout OFF → guest visits /checkout | Redirect to login |
| CHK-03 | Fill country + state + city + ZIP only (no name/email/street yet) | Shipping rates + tax (TaxJar) appear ~1s after location complete (debounced) — WC standard: calculation needs only the location; name/email/street are validated at Place Order |
| CHK-04 | Michigan address | Tax > 0 (MI nexus). Delaware address → Tax $0.00 (no sales tax — NOT a bug) |
| CHK-05 | Uncheck "Use same address for billing", fill billing form | Billing form appears below the checkbox; rates + tax still follow the SHIPPING address (WC rule); order in WC admin has distinct billing vs shipping |
| CHK-06 | Select different shipping rate | Total updates instantly |
| CHK-07 | Place Order with all card fields empty | Inline errors under all three fields at once; no API call |
| CHK-08 | Invalid card number (4242 4242 4242 4241) | Stripe inline error under card field, red border |
| CHK-09 | Valid 4242 card, complete address | Order placed → /checkout/success with order #, date, total, "Credit Card (Stripe)"; order in WC admin as Processing; NO 504 (emails deferred) |
| CHK-10 | Decline card 4000...0002 | Clear error, order not completed, cart intact |
| CHK-11 | 3DS card 4000 0027 6000 3184 | Stripe authentication modal → success page after confirm |
| CHK-12 | Order notes filled | Note appears on WC admin order |
| CHK-13 | WC customizer: set Phone = hidden | Phone field (next to ZIP Code in the address blocks) disappears; required = blocks order until filled; optional = shows "(optional)" label |
| CHK-13b | Apartment field (WC customizer: optional) | Collapsed "+ Add apartment, suite, etc." link shown; clicking expands the field; prefilled address_2 auto-expands it; required = always visible |
| CHK-14 | WC → Accounts & Privacy → "Enable log-in during checkout" OFF | "Returning customer?" notice does NOT render (allow 5-min ISR in prod) |
| CHK-15 | WC → "Allow customers to create an account" during checkout ON → guest checkout | "Create an account?" checkbox shows below billing fields; checked → order creates WP customer account + password setup email |
| CHK-16 | Same setting OFF (default) | No "Create an account?" checkbox; logged-in users never see it either way |
| CHK-17 | WC → General → Shipping location(s) = specific countries ≠ selling countries | Shipping address country dropdown lists SHIPPING countries; billing dropdown (when "Use same address for billing" unchecked) lists SELLING countries |
| CHK-18 | Visit /checkout before filling address (shippable cart) | Shipping method section visible with "Enter your shipping address to view shipping options." placeholder |
| CHK-21 | Logged-in customer with saved account addresses visits /checkout | Email + phone prefilled in Contact information; shipping form prefilled from saved shipping address (falls back to billing when no shipping saved); rates + tax auto-calculate from the prefilled address (WC standard) |
| CHK-22 | Guest fills address, leaves, returns to /checkout in same session | Previously entered address restored from the WC session (WC standard) |
| CHK-19 | Fill address matching NO shipping zone | Warning: "There are no shipping options available for this address."; Place Order blocked with "Please select a shipping option" error |
| CHK-20 | Free shipping rate offered | Rate price displays "Free" (not $0.00); Place Order button disabled while rates recalculate |
| CHK-23 | Place a successful order and watch the transition | Checkout swaps to a centered "Order received — taking you to your confirmation…" spinner, then the success page loads — NO flash of "Checkout unavailable" or the empty-cart screen in between |

## TC-COUPON — Coupons

| ID | Steps | Expected |
|---|---|---|
| CPN-01 | WC → create coupon SAVE10 (10%); at checkout "Have a coupon?" → apply SAVE10 | Discount row in summary "Coupon: SAVE10 −$X.XX [Remove]"; total drops |
| CPN-02 | Apply nonexistent code | WooCommerce's own error shown ("does not exist") |
| CPN-03 | Apply expired / min-spend-unmet coupon | WC's specific error passed through |
| CPN-04 | [Remove] applied coupon | Totals restore |
| CPN-05 | WC → General → coupons OFF | "Have a coupon?" section not rendered |
| CPN-06 | API: 70-char coupon code | 400 "Coupon code is too long." |

## TC-TAX — Tax Exemption Module

| ID | Steps | Expected |
|---|---|---|
| TAX-01 | Cart/checkout banner while status=pending | Message only — NO upload link |
| TAX-02 | Status expired/rejected/missing | Message + inline upload (Untitled UI file field + DatePicker) |
| TAX-03 | Submit with no file / no date / past date | Inline errors: "Please upload...", "Expiry date is required.", "Expiry date must be a future date." Errors clear on fix |
| TAX-04 | Valid upload | Banner flips to pending instantly; admin review email sent (async — arrives within ~1 min) |
| TAX-05 | Admin clicks APPROVE in email **while NOT logged in to WP** | Status approved; customer receives branded approval email; branded result page shown (no WP login prompt) |
| TAX-05b | Admin clicks APPROVE in email while logged in to WP | Same as TAX-05 + link to Tax Certificates dashboard shown on result page |
| TAX-05c | Admin clicks APPROVE button **twice** (idempotent) | Second click shows "status was already set — no change made"; no duplicate email sent |
| TAX-06 | Admin changes status via Users → Edit → dropdown → Update | Customer email sent (approved/rejected) — only when status actually changed |
| TAX-07 | Approved + valid expiry → place order | Tax = $0 at checkout (WC/TaxJar exempt) |
| TAX-07b | Approved cert whose expiry date has PASSED (or set expiry to yesterday via admin) → checkout with taxable address (e.g. MI) | Tax IS charged — exempt flag re-syncs live on every totals calculation, even mid-session without re-login |
| TAX-07c | Cert expires while user stays logged in; admin then re-approves with future expiry | Next cart/checkout recalculation returns to $0 tax — no logout/login needed |
| TAX-08 | Expiry within 30 days (set via admin) | Daily cron sends "expires soon" email once; banner shows "about to expire" |
| TAX-09 | Certificate URL from another user's account (logged in as user B) | 403 — download is owner-or-admin only |
| TAX-10 | Certificate attachment via /wp-json/wp/v2/media (logged out) | Not listed (private post status) |
| TAX-11 | Approve link from email older than 14 days | "Invalid or expired action link. Please ask the customer to re-submit..." — 403 response |
| TAX-12 | Tamper with token in Approve URL (change any character) | 403 — `hash_equals()` fails; no status change |
| TAX-13 | Reject URL used to approve (swap `do=reject` → `do=approve`) | 403 — action is part of the HMAC; tampered token fails |
| TAX-14 | Cert uploaded at registration → admin email received | Admin email arrives within ~30s with Approve/Reject buttons and cert download link |
| TAX-15 | Cert uploaded from Documents tab → admin email received | Same as TAX-14 |
| TAX-16 | Expiry reminder email (≤30 days) | HTML email with yellow heading, "Renew Certificate" CTA button, only sent once per expiry date |
| TAX-17 | Expired reminder email (<0 days) | HTML email with red heading, "Upload New Certificate" CTA, only sent once per expiry date |
| TAX-18 | GF admin notification with `{mmf_approve_url}`/`{mmf_reject_url}` | Tags replaced with working HMAC-signed URLs (contain `admin-post.php?action=mmf_tax_cert_action&token=`) |
| TAX-19 | GF notification when WP user not yet created (pending activation) | Tags fall back to Tax Certificates dashboard URL — no broken/empty link |
| TAX-20 | All code-sent tax emails (approve/reject/reminders) | Use shared template: logo header, white card on #F9F9F9, #CC9900 footer with current year — matches GF notification design |
| TAX-21 | Email URLs on dev vs live environment | All links/logo point to the sending site's own domain (home_url) — nothing hardcoded to pantheonsite.io |

## TC-NET30 — Net 30 Terms

| ID | Steps | Expected |
|---|---|---|
| N30-01 | Unflagged customer at checkout | Only Credit Card — no Net 30 option (also absent from /api/checkout payment_methods) |
| N30-02 | Admin: Users list → Net 30 column → click "Disabled" | Becomes "✓ Eligible" (green) without page reload |
| N30-03 | Flagged customer at checkout | TWO radio options; selecting Net 30 hides card fields, shows terms note |
| N30-04 | Place Net 30 order | No Stripe call; success page shows "Net 30 — Purchase Order Terms"; WC order Processing with COD method |
| N30-05 | Toggle off → customer's next checkout | Net 30 gone immediately |
| N30-06 | Non-admin hits the toggle AJAX endpoint directly | 403 (capability + nonce) |

## TC-DOC — Tax Exemption Date Picker

| ID | Steps | Expected |
|---|---|---|
| DOC-01 | Open Documents tab → upload form date field | Shows segmented date input (MM / DD / YYYY) with calendar icon — no browser-native `mm/dd/yyyy` picker |
| DOC-02 | Click calendar icon | Popover calendar opens; previous months before today are greyed out and unselectable |
| DOC-03 | Pick a future date from calendar | Field fills with selected date; popover closes |
| DOC-04 | Type date manually in segments | Month, day, year fields accept keyboard entry; Tab moves between segments |
| DOC-05 | Submit with no date selected | "Expiry date is required." inline error — calendar field participates in custom JS validation |

## TC-PM — Payment Methods

| ID | Steps | Expected |
|---|---|---|
| PM-01 | Navigate to Payment Methods tab | Shows list of saved cards (brand + last 4 + expiry) or "No payment methods saved yet." empty state |
| PM-02 | Click "Add Payment Method" | Stripe card form appears inline (Card Number, Expiry, CVC split fields); "Add Payment Method" button hides |
| PM-03 | Enter valid test card (4242 4242 4242 4242) | Save Card → card appears in list; form closes |
| PM-04 | Enter declined card (4000 0000 0000 0002) | Inline Stripe error under card field; list unchanged |
| PM-05 | Click Remove on a saved card | Card disappears from list immediately |
| PM-06 | Unauthenticated GET /api/account/payment-methods | 401 (WP cookie auth required) |
| PM-07 | DELETE /api/account/payment-methods/pm_xxx as different user | 403 — ownership verified via Stripe customer ID match |
| PM-08 | Skeleton while loading | Two skeleton card rows while initial fetch runs |

## TC-ACC — My Account

| ID | Steps | Expected |
|---|---|---|
| ACC-01 | Open /my-account | Default landing is "My Account" Dashboard — welcome message + recent orders + billing/shipping address cards |
| ACC-02 | Dashboard — welcome | Shows "Hello, [First Name]." with summary paragraph; pulls name from WP user profile |
| ACC-03 | Dashboard — recent orders | Last 5 orders shown as table; each row has order #, date, status badge, total + item count, View button |
| ACC-04 | Dashboard — View button | Navigates directly to Order Detail panel for that order |
| ACC-05 | Dashboard — Edit on address card | Navigates to Addresses section |
| ACC-06 | Dashboard — "View all orders" | Navigates to Orders section |
| ACC-07 | Dashboard skeleton | Two address card skeletons + 3-row order table skeleton while loading |
| ACC-08 | Sidebar navigation | Sections switch without reload; Dashboard is first item and default active; active item blue/bold |
| ACC-09 | Orders table | Figma layout: order # link, date, status, Certifications ⬇ Download, bold total + "N items" + View; skeleton table while loading |
| ACC-10 | Click order # or View | Order detail page: overview strip (number, date, status, total), line items table with spec/cert downloads, order totals (subtotal, shipping, tax, discount, total), payment method, billing+shipping addresses |
| ACC-11 | Certifications tab | Only certificate docs; only from shipped/completed orders; "Certificates are available after your order ships." empty state |
| ACC-12 | Spec Sheets tab | Spec sheets from all order statuses (processing, shipped, completed) |
| ACC-13 | Documents tab — approved cert | Status badge "Approved", expiry date, "View uploaded certificate" link; "Tax exempt at checkout" confirmation text |
| ACC-14 | Documents tab — pending cert | Status badge "Pending Approval" + info message "under review"; no upload form shown |
| ACC-15 | Documents tab — no cert / expired / rejected | Status card + upload form with expiry date field + file upload; validates required fields + future date |
| ACC-16 | Documents tab — upload success | Status card flips to "Pending Approval"; upload form hides |
| ACC-17 | Documents tab skeleton | Single skeleton card while loading tax exemption status |
| ACC-18 | Addresses — view | WC billing + shipping cards; empty state "You have not set up this type of address yet." |
| ACC-19 | Addresses — edit billing | Click Edit, fill form with country/state dropdowns, save → card updates; validation on required fields |
| ACC-20 | Addresses — edit shipping | Same as ACC-19 for shipping (no email/phone fields) |
| ACC-21 | Account Details — edit | Edit first name, last name, display name, email, company → Save → success message; validates required fields |
| ACC-22 | Account Details — change email to existing | Error "This email address is already in use." |
| ACC-23 | Password change | Current password + new password (≥8 chars) + confirm → success; wrong current password → error |
| ACC-24 | Password change — mismatch | New password ≠ confirm → "Passwords do not match." |
| ACC-25 | Payment Methods | Saved Stripe cards list + "Add Payment Method" button; see TC-PM for full coverage |
| ACC-26 | Skeleton loading | Every panel shows skeleton (table/card/form shapes) while fetching, not plain text |
| ACC-27 | Currency displays | Order totals show `$160.00` (decoded) — never `&#36;160.00` |
| ACC-28 | Order detail — cert visibility | Certificates column shows download only for shipped/completed orders; shows "—" for processing orders |
| ACC-29 | Spec Sheets tab — same product bought in 2+ orders | The spec sheet appears ONCE (under the most recent order) — spec sheets are product-level docs, not per-order; an order left with no unique spec sheets disappears from the tab |
| ACC-30 | Spec Sheets / Certifications / Order detail — click Download | File DOWNLOADS via `/api/download` (no new tab) — same behavior as the shop table and product detail page |

## TC-CHK-VAL — Checkout Validation

| ID | Steps | Expected |
|---|---|---|
| CHK-VAL-01 | Click Place Order with empty billing form | All required fields show red border + inline "X is a required field." errors; toast "Please fill in all required checkout fields." **No browser-native "Please fill out this field." tooltip — WooCommerce uses inline JS validation only** |
| CHK-VAL-02 | Enter invalid email format at checkout | "Please enter a valid email address." inline error |
| CHK-VAL-03 | Fill billing but leave empty shipping (Ship to different checked) | Shipping fields show validation errors |
| CHK-VAL-04 | Fix a validation error (type in field) | Red border + error text clears immediately on that field |
| CHK-VAL-05 | Place Order with Stripe, empty card fields | "Enter your card number." / "Enter the expiration date." / "Enter the security code." inline errors |
| CHK-VAL-06 | Click Place Order while shipping rates are updating | Button remains enabled and clickable — rate update is a background process; WooCommerce standard |
| CHK-VAL-07 | Section heading in checkout billing area | Heading reads "Billing details" (not "Billing & Shipping") — WooCommerce standard label |

## TC-SHIP — Shippo Shipping & Fulfillment (run after plugin install)

Pre-req: Shippo plugin active, client's UPS/FedEx accounts connected, ship-from
address set. Full setup + flow: [shippo-guide.md](shippo-guide.md).

| ID | Steps | Expected |
|---|---|---|
| SHIP-01 | Checkout with full US address | Live UPS/FedEx rates listed as radio options alongside/instead of zone methods; each shows name + price |
| SHIP-02 | Select a different rate | Order total updates to include the chosen rate (server-recalculated) |
| SHIP-03 | Change the delivery address mid-checkout | Rates refresh automatically, no reload |
| SHIP-04 | Place order | Chosen carrier/service + shipping cost on the WC order and the order confirmation/email |
| SHIP-05 | Generate label in Shippo for the order | Label produced; tracking number written back to the WC order |
| SHIP-06 | My Account → order detail (after label) | "Shipment Tracking" section: carrier + clickable tracking number (+ ship date when provided) |
| SHIP-07 | Shipping-notification email | Contains the tracking number/link |
| SHIP-08 | Order detail API as a DIFFERENT logged-in user | 403 — tracking numbers never leak across accounts |
| SHIP-09 | Product missing weight or dimensions | No live rate for it — fix product data (import warns); checkout code is not the bug |
| SHIP-10 | Order without tracking yet (processing) | No "Shipment Tracking" section — appears only once tracking exists |

## TC-SET — WooCommerce Settings Reactivity

| ID | Steps | Expected |
|---|---|---|
| SET-01 | WC → General → change currency to EUR | Within 5 min (instant dev): € on product tables, cart, checkout, order history |
| SET-02 | WC → selling countries: US only ↔ all | Checkout country dropdown follows |
| SET-03 | Add/remove shipping method in zone | Rate options at checkout follow |
| SET-04 | Enable/disable a payment gateway | Checkout options follow per customer |

## TC-PERF — API Performance (run after ANY proxy-route change)

| ID | Steps | Expected |
|---|---|---|
| PERF-01 | With an existing cart session (cookies set), add to cart / change qty / update address / apply coupon — watch the Network tab | Each `/api/cart/*` call completes in ONE WP round trip (no preceding cart GET inside the proxy); noticeably faster than before |
| PERF-02 | Fresh browser (no cookies) → first add to cart | Works — proxy bootstraps a session (2 round trips, first request only), cart cookie + nonce set for subsequent calls |
| PERF-03 | Delete/corrupt the `wc_store_nonce` cookie value → change cart qty | Still works — proxy gets 401/403, bootstraps a fresh session, retries once transparently |
| PERF-04 | Type in search box repeatedly (same query) | Repeat lookups return fast (30s per-query micro-cache + shared 60s CDN cache); results still fresh within ~1 min of WP changes |
| PERF-05 | Load any page twice | `/api/menu` served from cache on repeat (5-min TTL); menu edits appear within 5 min in prod, instantly in dev |
| PERF-06 | Place order end-to-end (Stripe test card) | Order succeeds — place-order also uses the single-round-trip fast path |

## TC-SEC — Security Regression (run after ANY auth/upload/API change)

| ID | Steps | Expected |
|---|---|---|
| SEC-01 | `curl -X POST /api/cart/coupon -d '{"code":"<70 chars>"}'` | 400 |
| SEC-02 | Login redirect `//evil.com` (AUTH-06) | Stays on site |
| SEC-03 | Prod cookies (devtools → Application) | `wc_cart_token`, `wc_store_nonce`: HttpOnly + Secure + SameSite=Lax |
| SEC-04 | Other user's cert download URL | 403 |
| SEC-05 | `/wp-json/custom/v1/tax-exemption` without login | 401 |
| SEC-06 | `/wp-json/custom/v1/orders` as user A vs B | Each sees only own orders |
| SEC-07 | REST request with wrong X-MMF-Proxy value (when MMF_PROXY_SECRET defined) | Treated as unauthenticated |
| SEC-08 | Response headers on any page | HSTS, X-Frame-Options, nosniff, Referrer-Policy present |
| SEC-08b | Response headers on any PROD page (`next start`, not dev) | `Content-Security-Policy` present — script-src limited to self + js.stripe.com; frame-src Stripe only; object-src 'none' |
| SEC-08c | Checkout with CSP active (prod build) | Stripe card fields render + test order succeeds — no CSP violations in browser console |
| SEC-09 | GET `/api/orders/123` as different user | 403 Forbidden (order belongs to another customer) |
| SEC-10 | POST `/api/account/details` with another user's email | 409 "email already in use" (no data leak) |
| SEC-11 | POST `/api/account/password` with wrong current password | 403 "current password is incorrect" |

---

## Automated checks (run before every commit)

```bash
npx tsc --noEmit        # 0 errors required
npx next lint           # 0 errors required
php -l wordpress/inc/*.php wordpress/functions.php
```
