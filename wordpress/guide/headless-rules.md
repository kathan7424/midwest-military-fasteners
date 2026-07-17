# Headless Development Rules — Midwest Military Fasteners

The ONE rulebook for building on this stack. Every feature, fix, and refactor
must pass these rules before it ships. Next.js (frontend) + WordPress/WooCommerce
(commerce engine). WooCommerce is ALWAYS the source of truth.

---

## Rule 1 — WooCommerce decides, the frontend renders

The frontend never invents commerce behavior. Every business rule comes from a
WooCommerce setting, hook, or API response:

- **Settings drive UI**: guest checkout, login reminder, account creation,
  coupons, order notes, field visibility, selling/shipping countries, currency —
  all read from `/custom/v1/checkout/locations` and honored at render time.
  Adding a new behavior? First ask: "which WC setting controls this?" and wire it.
- **Cart math happens in WC**: prices, tier pricing, tax, shipping, discounts —
  never computed client-side. The frontend displays what the Store API returns.
- **Cart merging is WC-native**: same product = one row, quantities accumulate.
  Don't reimplement cart logic on the client.
- **Gateways come from the cart response**: WooCommerce filters payment methods
  per customer (Net 30 for flagged accounts). Render what the API returns.
- **Auth follows WP**: `wordpress_logged_in_*` cookie is the session; the proxy
  (`src/proxy.ts`, Next.js 16 convention) guards only truly protected pages
  (`/my-account`). Cart is ALWAYS guest-accessible; checkout access follows
  the WC guest-checkout setting.

## Rule 2 — Fast by architecture, not by accident

Every page and interaction follows these performance patterns:

- **Server Components first**: data fetched on the server, HTML streamed.
  Client components only where interactivity demands it (`"use client"` is a
  cost, not a default).
- **Cache with intent**:
  - WC settings/locations → 5-min ISR in prod (`next: { revalidate: 300 }`),
    `no-store` in dev + WP-side 5-min transient busted on `woocommerce_settings_saved`.
  - Cart/checkout/account → ALWAYS `no-store` (session data, never cached).
  - Catalog pages → ISR where content changes rarely.
- **Filter/search pattern** (shop + category pages):
  1. Instant client-side filter on already-loaded rows (0ms feedback)
  2. Debounced (150ms) server search for the full catalog
  3. `AbortController` cancels stale requests; request-id guard drops
     out-of-order responses
  4. Skeleton/pending indicator while the server responds — never a frozen UI
- **Optimistic updates**: cart quantity changes render immediately, server
  response reconciles, errors roll back (see `cart.store.ts`).
- **Parallel fetches**: independent data loads use `Promise.all` — never
  sequential awaits (see `checkout/page.tsx`, `login/page.tsx`).
- **Single-open accordions**: sidebar keeps ONE group open — controlled state,
  no layout thrash, predictable navigation.
- **Skeletons everywhere data loads**: shop, category, checkout, My Account
  panels. Text "Loading..." is banned; a skeleton that never resolves means the
  API failed — always pair skeletons with an error state.

## Rule 3 — Security is non-negotiable

- **All WP calls proxied**: the browser talks only to Next.js `/api/*` routes;
  WP credentials/URLs stay server-side. `ENV.WP_SITE_URL` never ships to the client.
- **Allowlist, never blocklist**:
  - Addresses → `pickWcAddress()` strips to WC-known keys before proxying.
  - Download proxy → WP origin ONLY + file-extension allowlist (no open proxy).
  - Redirect params → same-origin paths only (`/` prefix, reject `//` and `/\`).
- **Sanitize at the WP boundary**: every REST param through
  `sanitize_text_field` / `sanitize_email` / `absint`; escape output with
  `esc_url` / `esc_html`.
- **Signed action URLs**: admin approve/reject links are HMAC-SHA256 signed,
  single-purpose, expiring — never bare IDs in URLs.
- **Sessions via HttpOnly cookies**: no tokens in localStorage, no secrets in
  client bundles, no card data touching our servers (Stripe Elements iframes).
- **Errors fail loudly and safely**: WP PHP fatals (HTML with HTTP 200) are
  detected (unparseable JSON → 503) so the frontend always knows. User sees a
  friendly error + retry — never a stuck skeleton, never a raw stack trace.
- **Rate-limit friendly**: forward `X-Forwarded-For` so WP rate limiting sees
  real client IPs.

## Rule 4 — WordPress code standards

- Every function prefixed `mmf_` (theme) or `parts_catalog_` (catalog) — and
  declared ONCE. Before adding a function, grep for its name (redeclaration =
  fatal on every request).
- `php -l` every changed file before it ships.
- Hooks over core hacks: behavior changes via `add_action`/`add_filter` only.
- Transients for expensive reads, busted by the matching save-action hook.
- Email templates through `mmf_email_template()` — one design, environment-safe
  URLs (`home_url()`, `wp_get_upload_dir()`), never hardcoded domains.

## Rule 5 — Frontend code standards

- **No inline CSS** — Tailwind classes; shared form constants from
  `form-styles.ts`. (Exception: runtime-computed values like brand colors.)
- **Types are the contract**: every API response has a type in `src/types/`;
  API changes update the type in the same commit.
- **`npx tsc --noEmit` + ESLint clean** before done — every turn.
- Errors surface where the user acts: inline field errors (react-hook-form
  `setError`) for form fields, toasts for global events, scroll-to-top on
  checkout errors.
- Components read like the room: match naming, comment density, and file
  header conventions already in the codebase.

## Rule 6 — Ship-gate checklist

Before any change is "done":

1. `npx tsc --noEmit` — clean
2. `php -l` on every touched PHP file — clean
3. WC settings that affect the feature actually toggle it (test ON and OFF)
4. Error path tested: what does the user see when WP is down? (banner + retry,
   not a stuck skeleton)
5. Guides updated in the same turn: `qa-guide.md` gotchas + `test-cases.md` IDs
6. No credentials, tokens, or private URLs in code, comments, or guides

---

*Pairs with `qa-guide.md` (how to test), `test-cases.md` (what to test),
`security-guide.md` (deep security model).*
