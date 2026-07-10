# Security Guide — Midwest Military Fasteners (Headless WooCommerce)

Every security rule this project follows, why it exists, and how to keep it
intact when adding features. **Read this before touching auth, checkout,
uploads, or any API route.**

Audited: 2026-07-09 (full Next.js + WordPress audit — all High/Medium findings fixed).

---

## 1. Architecture Trust Boundaries

```
Browser ──(HTTPS, no WP cookies exposed to JS)──► Next.js API routes (proxy)
                                                        │
                                     X-MMF-Proxy secret + WP cookies forwarded
                                                        ▼
                                            WordPress / WooCommerce (Pantheon)
                                                        │
                                            Stripe (server-side charge only)
```

- The browser NEVER talks to WordPress directly for authenticated actions —
  everything goes through Next.js `/api/*` proxy routes.
- Card data NEVER touches our servers — Stripe Elements iframes tokenize in
  the browser; only the resulting `pm_...` id transits our API (PCI SAQ-A).
- WordPress is the source of truth for auth, orders, pricing, tax, stock.
  The frontend never computes money — it displays what WC returns.

## 2. Next.js Frontend Rules

| Rule | Where enforced | Why |
|---|---|---|
| Session cookies: `HttpOnly; SameSite=Lax` + `Secure` (prod) | `src/utils/auth-proxy.utils.ts` → `appendSetCookie()` | XSS cannot read sessions; MITM cannot capture them |
| Never use `NextResponse.cookies.set()` next to forwarded WP cookies | same file — always `appendSetCookie()` | `cookies.set()` clobbers manually-appended set-cookie headers (real bug we fixed) |
| Login `redirect` param: must start with `/`, must NOT start with `//` or `/\` | `src/components/pages/Auth/LoginPanel.tsx` | Open-redirect phishing (`//evil.com`) |
| All user input clamped before proxying | quantity [1–9999] (cart routes), search q ≤100, coupon ≤64, note ≤1000, upload ≤10MB (413) | Upstream abuse, cache flooding, absurd orders |
| Auth proxies forward `X-Forwarded-For` | login/register/forgot-password routes | WP-side rate limiting sees the real client, not our server IP |
| Every route: try/catch → generic `{message}`, details only to `console.error` | all `src/app/api/**` | No stack traces / internals leak to clients |
| Revalidation secret in `x-revalidate-secret` header, constant-time compare | `src/app/api/revalidate/route.ts` | Secrets in URLs land in access logs |
| Security headers on every response | `next.config.ts` (HSTS, X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy) | Baseline browser protections |
| Secrets only in server env — NEVER `NEXT_PUBLIC_*` | `MMF_PROXY_SECRET`, `REVALIDATION_SECRET` | `NEXT_PUBLIC_` vars ship to the browser bundle |
| `dangerouslySetInnerHTML` only for WP-originated HTML | price_html, page content, footer | User-controlled strings are never rendered as HTML |
| No inline CSS (`style=` attributes) | project-wide convention | Only exception: values computed at runtime (progress %, measured offsets) |

## 3. WordPress / WooCommerce Rules

| Rule | Where enforced | Why |
|---|---|---|
| Headless proxy auth requires shared secret | `inc/auth.php` `mmf_headless_cookie_auth()` — `hash_equals(MMF_PROXY_SECRET, X-MMF-Proxy)` | Header presence alone was forgeable by non-browser clients |
| Tax certificates are PRIVATE attachments | `inc/tax-exemption.php` — `post_status: private` + gated `admin_post_mmf_tax_cert_download` (owner or `manage_woocommerce` only, HMAC token, 14-day expiry) | They contain business tax IDs — were world-readable before the audit |
| Upload validation server-side | `mmf_validate_tax_cert_upload()` — PDF/JPG/PNG/DOC/DOCX + 5MB, on BOTH upload paths | Client-side checks are advisory only |
| Every state-changing handler: nonce + capability | all `wp_ajax_*`, `admin_post_*`, profile saves — `check_ajax_referer` / `wp_verify_nonce` + `current_user_can('manage_woocommerce')` | CSRF + privilege escalation |
| One-click email action URLs: HMAC + expiry | `mmf_build_tax_cert_action_url()` — `hash_hmac(sha256, payload+expires, wp_salt('auth'))` | Leaked/forwarded emails can't approve forever |
| Customer REST endpoints operate ONLY on `get_current_user_id()` | tax-exemption, orders, addresses routes | No IDOR — user A can never pass user B's id |
| Auth endpoints: identical errors for wrong-user vs wrong-password | `mmf_auth_login`, forgot-password | Account enumeration |
| Every inc/*.php starts with `defined('ABSPATH') \|\| exit;` | all files | Direct file execution |
| Output: `esc_html`/`esc_attr`/`esc_url` on everything echoed | admin screens, emails | Stored XSS |
| SQL only via `$wpdb->prepare` / WP_Query | `mmf_search_post_ids_by_slug` is the only raw SQL — parameterized | SQLi |
| Net 30 gateway filtered SERVER-side | `inc/net30.php` `woocommerce_available_payment_gateways` | Hiding it in the UI alone is bypassable via API |

## 4. Secrets Inventory (deploy checklist)

| Secret | WP side | Next.js side | Notes |
|---|---|---|---|
| `MMF_PROXY_SECRET` | `wp-config.php` define | env var (server-only) | Same long random value both sides. Until defined, legacy "1" accepted — **define it in production** |
| `REVALIDATION_SECRET` | `MMF_NEXTJS_REVALIDATION_SECRET` define | env var | Sent via `x-revalidate-secret` header |
| Stripe secret key `sk_...` | WC Stripe plugin settings ONLY | **never** | Frontend gets `pk_...` publishable only |
| WP admin / DB credentials | Pantheon | never | — |

Rotate any secret that ever appears in a log, chat, or commit.

## 5. Rules for New Code (checklist per PR)

1. New API route? → try/catch + generic error + input length/type caps + `no-store` if user-specific.
2. New WP endpoint? → `permission_callback` (never `__return_true` for user data), `sanitize_callback` on args, operate on `get_current_user_id()` only.
3. New admin action? → nonce + `current_user_can('manage_woocommerce')`.
4. New upload? → server-side mime + size validation, private storage, gated download.
5. New form? → validate client-side (UX) AND server-side (security).
6. New email with links? → HMAC-signed URLs with expiry; escape all interpolated values.
7. Money/price anywhere? → comes from WooCommerce, formatted by `format_store_price()` / `mmf_plain_price()` — never hardcode currency.
8. Run before commit: `npx tsc --noEmit`, `npx next lint`, `php -l` on changed PHP.

## 6. Account Endpoints (added 2026-07-09)

All account-modification endpoints require `is_user_logged_in` permission callback
and operate only on the current user (`get_current_user_id()`). No cross-user access.

| WP Endpoint | Proxy Route | Auth | Notes |
|---|---|---|---|
| `POST /account/details` | `/api/account/details` | cookie + proxy secret | Updates name, email, company; validates unique email |
| `POST /account/addresses` | `/api/account/addresses` | cookie + proxy secret | Updates billing or shipping via WC_Customer; type param required |
| `POST /account/password` | `/api/account/password` | cookie + proxy secret | Validates current password via `wp_check_password`; re-sets auth cookie |
| `GET /orders/{id}` | `/api/orders/[id]` | cookie + proxy secret | Returns order only if `customer_id === current_user`; 403 otherwise |
| `GET /account/payment-methods` | `/api/account/payment-methods` | cookie + proxy secret | Lists Stripe PMs for the current user's Stripe customer ID only |
| `POST /account/payment-methods` | `/api/account/payment-methods` | cookie + proxy secret | Creates SetupIntent for current user; creates Stripe customer if needed |
| `DELETE /account/payment-methods/{pm_id}` | `/api/account/payment-methods/[pm_id]` | cookie + proxy secret | Retrieves PM from Stripe first; 403 if `pm.customer !== user's stripe_customer_id` |

## 7. Tax Cert Email Token Model

Admin approve/reject links use HMAC-SHA256 signed URLs. No WP login is required to act on them.

**Token payload:** `"mmf-tax-cert|{user_id}|{action}|{expires}"` signed with `wp_salt('auth')`.

**Properties:**
- Scoped: token is bound to one user_id + one action (`approve`/`reject`) — cannot swap action or redirect to another user
- Time-limited: 14-day expiry encoded in payload, verified server-side
- Tamper-proof: any URL parameter change breaks `hash_equals()`
- Idempotent: double-clicking does nothing, just shows "already set"
- No login required: `admin_post_nopriv_mmf_tax_cert_action` fires for unauthenticated requests; login link shown on result page if admin happens to be logged in

**What the token does NOT provide:** it does not authenticate the clicking user as a specific WP admin. It proves the link was generated by this server for this action. If the admin email account is compromised, the attacker can approve/reject certs. This is the same risk as any email-based workflow (password reset, WooCommerce order cancel, etc.) and is accepted.

**Cert download tokens** (`mmf-tax-cert-download|...`) are separate and additionally require WP login — certificate files are sensitive business documents.

**Gravity Forms merge tags** `{mmf_approve_url}` / `{mmf_reject_url}` (registered via `gform_replace_merge_tags`) generate the same HMAC-signed URLs at notification-send time. User resolution order: GF User Registration `_gform-entry-id` user meta → entry `created_by` → email-field match. If no user resolves (pending activation), the tags fall back to the Tax Certificates dashboard URL — never a broken link. No URLs are hardcoded: logo comes from `wp_get_upload_dir()`, links from `home_url()`/`admin_url()`.

## 9. Content Security Policy (production)

`next.config.ts` sends a CSP on every production response (dev is exempt —
HMR needs eval). Verified live with `next start`:

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'self'` | Everything not listed below is same-origin only |
| `script-src` | `'self' 'unsafe-inline' js.stripe.com` | Next runtime needs inline; Stripe.js |
| `connect-src` | `'self' api/r/js.stripe.com + WP host` | Stripe tokenization/telemetry; WP assets |
| `img-src` | `'self' data: blob: WP host *.stripe.com` | Product images from WP; card brand icons |
| `frame-src` | `js.stripe.com hooks.stripe.com` | Card element + 3DS iframes |
| `object-src` / `base-uri` / `form-action` / `frame-ancestors` | `'none'` / `'self'` / `'self'` / `'self'` | Standard lockdown |
| `upgrade-insecure-requests` | — | Any stray http:// asset auto-upgrades |

The WP host is derived from `NEXT_PUBLIC_WP_SITE_URL` — no hardcoded domain;
prod/live envs get the right origin automatically. If Stripe checkout breaks
after a CSP edit, check the browser console for `Content-Security-Policy`
violations first.

## 10. Known Accepted Risks

- `'unsafe-inline'` remains in script-src (Next.js app-router runtime requirement) — script injection is still constrained by `default-src`, `object-src 'none'`, `base-uri 'self'`, and WP-content escaping in the app. A nonce-based strict CSP is a future hardening step.
- WP origin (`NEXT_PUBLIC_WP_SITE_URL`) is visible to clients — acceptable; public endpoints only, auth is cookie-gated.
- `check-email` endpoint reveals whether an email is registered (registration UX trade-off) — consider rate limiting at the edge.
