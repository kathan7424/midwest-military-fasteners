# API Guide — REST Endpoints

Base URL: `https://<wp-host>/wp-json`

All `spec-parts/v1` responses carry `Cache-Control: public, max-age=300, s-maxage=300` (set in `inc/catalog-api.php`) so Pantheon Varnish never holds them longer than 5 minutes.

## spec-parts/v1 — Catalog (public, read-only)

### GET `/spec-parts/v1/products`

Product listing with filters. Only **published** products.

| Param | Type | Notes |
|---|---|---|
| `search` | string | Title / excerpt / content / SKU substring |
| `sku` | string | Exact SKU match |
| `slug` | string | Exact post slug |
| `category` | slug | Matches the term **and its duplicate same-name terms** |
| `series` | slug | Matched in both `product-series` and `product_series` taxonomies |
| `manufacturer` | name | `pa_manufacturer` attribute |
| `country` | name | `pa_country` attribute |
| `dfar` | 0/1 | `pa_specs_standard` = DFAR |
| `per_page` | int | default 50, max 200 |
| `page` | int | default 1 |

Response:
```json
{
  "total": 311, "pages": 32, "page": 1, "per_page": 10,
  "products": [ { …product… } ]
}
```

Product object fields: `id`, `sku`, `name/partNumber`, `description`, `price`, `pkg_qty`, `package_pricing` (tiers), `stock_status`, `stock_quantity`, `image`, `spec_file_url`, `certificate_file_url`, `manufacturer`, `country`, `dfar`, `backorder_leadtime`, `mfr_coc`, `material_certs`, `process_certs`, `test_reports`, `piece_weight`, `product_series`, category refs.

> **Never returned** (internal-only): `_lot_in_use`, `_cert_location`, `_reorder_limit`.

### GET `/spec-parts/v1/products/{id}` · `/products/sku/{sku}` · `/products/slug/{slug}`

Single product by ID, SKU, or slug. Same shape as one `products[]` item. 404 when missing.

### GET `/spec-parts/v1/categories`

The sidebar tree. Categories are **normalized** into three canonical parents — Screws, Nuts, Washers — regardless of how terms are parented in WP (name inference: contains "WASHER" → washers, "NUT" → nuts, else screws). `Uncategorized` is skipped. Duplicate same-name child terms are merged (highest count wins).

Each child carries `series[]` — the product-series terms actually used by products in that category (drafts included so structure survives on staging sites; only term id/name/slug/count is exposed — no product data).

```json
[
  { "id": 19, "name": "Screws", "slug": "screws", "count": 1630, "children": [
      { "id": 20, "name": "Hex Cap Screws", "slug": "hex-cap-screws", "count": 301,
        "series": [ { "id": 33, "name": "MS35307", "slug": "ms35307", "count": 44 } ] }
  ] }
]
```

### GET `/spec-parts/v1/categories/slug/{slug}`

Single category (hero image + description).

### GET `/spec-parts/v1/series`

All product-series terms (non-empty).

## custom/v1 — Site (public unless noted)

| Endpoint | Purpose |
|---|---|
| GET `/custom/v1/menu/{location}` | Nav menu items |
| GET `/custom/v1/site-settings` | Logo, header/footer, WooCommerce page paths |
| GET `/custom/v1/home-page` | Home page ACF content |
| GET `/custom/v1/product-catalog` | Home hero catalog blocks |
| GET `/custom/v1/search?q=` | Global search |

### Auth (`custom/v1/auth/*`)

| Endpoint | Notes |
|---|---|
| POST `/auth/login` | Sets WP auth cookie (`is_ssl()`-aware). No throttling in code — add rate limiting at platform level |
| POST `/auth/logout` | Clears session |
| POST `/auth/register` | Via Gravity Forms API |
| POST `/auth/forgot-password` | **Always** returns the same generic success message (no user enumeration) |
| GET `/auth/me` | Current user (requires cookie) |

### Cart (`custom/v1/cart/*` — login required)

All routes gated by `mmf_cart_permission`. Inputs sanitized (`absint` / `sanitize_text_field`); purchasability and stock validated server-side. Quantity limits come back in `quantity_limits` per item — the frontend clamps and messages from those.

## wp/v2 — used by the frontend

- `/wp/v2/product-series` (or `/wp/v2/product_series`) — series terms, `show_in_rest` enabled
- `/wp/v2/product?product_cat={id}&_fields=id,product-series,product_series` — fallback series sweep (only when the categories API returned a child without series)

## Frontend proxy routes (Next.js `/api/*`)

| Route | Cache-Control | Purpose |
|---|---|---|
| `/api/catalog/categories` | `public, max-age=60, s-maxage=120, SWR 600` | Sidebar warmup |
| `/api/catalog/products` | `public, max-age=30, s-maxage=60, SWR 300` | Client-side table search |
| `/api/search` | `public, max-age=30, s-maxage=60, SWR 300` (+ per-query 30s WP micro-cache) | Search suggestions |
| `/api/menu` | `public, max-age=300, SWR 3600` (+ ISR'd WP fetch) | Header/footer nav |
| `/api/checkout/locations` | `public, max-age=300, SWR 3600` (5-min ISR) | Countries/states + WC settings |
| `/api/cart/*` | no-store | Cart (per-user) |
| `/api/auth/*` | no-store | Auth |

## Store API mutation fast path (performance invariant)

Every cart/checkout mutation route goes through `wcStoreMutation()`
(`src/utils/wc-cart-proxy.utils.ts`) — do NOT reintroduce per-route
"bootstrap `GET /cart` then mutate" sequences:

- **Fast path (the common case):** the browser already carries the Store API
  session cookies (nonce + cart token) from a previous cart response → the
  mutation is ONE WordPress round trip.
- **Slow path (first request of a session / expired nonce → 401/403):**
  bootstrap `GET /cart` for a fresh session, retry once with the fresh
  nonce/cart-token taking precedence over the stale cookies.

Before this helper, every add-to-cart / quantity change / address update /
coupon / place-order paid TWO sequential WP round trips (~300–800ms wasted
per call on Pantheon). Routes on the fast path: `cart` (add), `cart/update`,
`cart/remove`, `cart/coupon`, `cart/select-shipping`, `cart/customer`,
`checkout` (place order).

## Security invariants (do not regress)

1. Public endpoints expose **published** product data only (the `'any'` status exception aggregates series *term names* for the sidebar — never product fields).
2. Internal meta (`_lot_in_use`, `_cert_location`, `_reorder_limit`) stays out of every public payload.
3. All `$wpdb` queries use `prepare()`.
4. Mutating endpoints require login (cart) or capability + nonce (admin import).
5. Auth endpoints return uniform messages — no account-existence oracles.
6. Tax exemption certificates are **private** attachments (`post_status: private`) — never linked by raw media URL. All views/downloads go through the gated `admin-post.php?action=mmf_tax_cert_download` handler (login + owner-or-`manage_woocommerce` + 14-day HMAC token). `certificate_url` in API responses is the gated URL.
7. Certificate uploads (REST + registration) are validated server-side: PDF/JPG/PNG/DOC/DOCX only, max 5MB.
8. The headless proxy header `X-MMF-Proxy` must match `MMF_PROXY_SECRET` (wp-config.php) via `hash_equals()`; legacy value `"1"` is accepted until the constant is defined — set it, plus the matching Next.js env value.
9. One-click approve/reject email links carry an HMAC-covered `expires` timestamp (14 days) and are rejected after expiry.
10. The Next.js revalidation webhook sends the secret as the `x-revalidate-secret` header (query param kept for back-compat).
