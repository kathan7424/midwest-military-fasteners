# Midwest Military Fasteners — Developer Guide

Headless WordPress + WooCommerce backend with a Next.js frontend.

| Layer | Tech | Location |
|---|---|---|
| Backend | WordPress + WooCommerce (headless) | `wordpress/` (theme), Pantheon (`dev-mmf-wp.pantheonsite.io`) |
| Frontend | Next.js (App Router, React Compiler) | `src/` |
| Shipping | Shippo plugin (uses WC native weight/dims) | WP plugin |
| Payments/Orders | WooCommerce | WP |

## Architecture

```
Next.js frontend (localhost:3000 / production)
   │  REST (JSON)
   ▼
WordPress REST API
   ├── /wp-json/spec-parts/v1/*   ← catalog (products, categories, series)
   ├── /wp-json/custom/v1/*       ← menu, site settings, search, auth
   ├── /wp-json/custom/v1/cart/*  ← cart (login required)
   └── /wp-json/wp/v2/*           ← core taxonomies (product-series)
```

- The PHP theme renders **no** customer-facing pages. All UI is Next.js.
- The `[parts_catalog]` shortcode (inc/shortcode.php) exists only as a non-headless fallback and is unused in production.

## Theme file map (`wordpress/`)

| File | Purpose |
|---|---|
| `functions.php` | Taxonomy registration (`product-series`), requires, SVG policy (admin-only), theme setup |
| `inc/catalog-api.php` | `spec-parts/v1` REST namespace — products, categories (normalized sidebar tree), series. Edge cache capped at 5 min via `rest_post_dispatch` |
| `inc/api.php` | `custom/v1` — menu, site-settings, home-page, product-catalog, search |
| `inc/auth.php` | Login/logout/register/forgot-password (generic responses — no user enumeration) |
| `inc/cart.php` | Cart endpoints, login required (`mmf_cart_permission`) |
| `inc/import.php` | CSV product importer + admin page (WooCommerce > Parts Import) |
| `inc/product-spec.php` | Spec Sheet / Certificate PDF fields on product edit (WP Media uploader) |
| `inc/order-documents.php` | Order document handling |
| `inc/tax-exemption*.php` | Tax exemption feature |
| `import-template.csv` | Sample CSV served by the "Download sample CSV" button (must live in theme root) |
| `acf-export-package-pricing.json` | ACF group `group_spec_parts_v2` — pricing tiers repeater (qty + price ONLY) |

## Data model (per product)

| Data | Storage |
|---|---|
| SKU, title, price, weight, dims, stock | WooCommerce native |
| Categories | `product_cat` (Screws / Nuts / Washers → children) |
| Series (MS35307 …) | `product-series` custom taxonomy (import may also create `product_series`; both are read) |
| Manufacturer / Country / DFAR | WC attributes `pa_manufacturer`, `pa_country`, `pa_specs_standard` |
| Pricing tiers | ACF repeater `package_pricing_tiers` (admin UI) **+** `_package_pricing` post meta (runtime source for cart/API) |
| Pkg qty | `_pkg_qty` post meta |
| Spec / Certificate PDFs | `_spec_file_url`, `_certificate_file_url` post meta |
| Compliance flags | `_mfr_coc`, `_material_certs`, `_process_certs`, `_test_reports` |
| Internal-only (never in public API) | `_lot_in_use`, `_cert_location`, `_reorder_limit` |

## Frontend notes (`src/`)

- **Data fetching**: `src/services/wp-api.service.ts` — ISR (`revalidate`) in production, `no-store` in development (so WP changes show instantly while developing).
- **Sidebar**: `/spec-parts/v1/categories` returns the normalized Screws/Nuts/Washers tree **with series per child**. Empty categories (no products, no series) are hidden (`map_spec_parts_categories_to_sidebar`). The per-category taxonomy sweep only runs as fallback for children the API returned without series.
- **Cart**: Zustand store (`src/stores/cart.store.ts`) → `/api/cart/*` Next routes → WP cart endpoints. Toast messages use WooCommerce core wording.
- **Stock UX**: qty input has no native `max` — over-stock input triggers a toast ("You cannot add that amount to the cart — we have N in stock.") and clamps.
- **Security headers**: set globally in `next.config.ts` (HSTS, nosniff, frame-options, permissions-policy).

## Caching layers (know these before debugging "stale data")

| Layer | TTL | Clear how |
|---|---|---|
| Pantheon Varnish (WP REST) | 5 min (`rest_post_dispatch` filter) | Pantheon Dashboard → Clear Caches |
| Next.js Data Cache (prod) | `revalidate` 120–300 s | redeploy / revalidate |
| Next.js Data Cache (dev) | **disabled** (no-store) | — |
| Next API routes (`/api/catalog/*`) | `s-maxage` 60–120 s + SWR | wait or redeploy |
| Browser | `max-age` 30–60 s | hard refresh |

Logged-in WP admin requests **bypass** Varnish — you may see fresh data in the browser while anonymous/frontend requests still get cached responses. Always verify with `curl`.

## Deployment (Pantheon)

Theme files deploy via Pantheon SFTP or Pantheon git (separate from the GitHub frontend repo). After uploading PHP changes: **Dashboard → Clear Caches**.

Frontend deploys from the GitHub repo (`origin/dev` branch).

## More guides

- [API guide](./api-guide.md) — every endpoint, params, response shapes
- [Import guide](./import-guide.md) — CSV format, folders, media, troubleshooting
