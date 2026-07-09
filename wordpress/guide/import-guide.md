# Product Import Guide (CSV)

Admin page: **WooCommerce → Parts Import** (capability: `manage_woocommerce`).
Tabs: Import · Settings · CSV Guide. Sample file: theme root `import-template.csv` (served by the "Download sample CSV" button — the file must exist at `wp-content/themes/<theme>/import-template.csv` on the server).

## CSV format — 36 columns, positional

The importer reads columns **by position, not by header name** (headers repeat: multiple SHIPPING DIMENSIONS / SHIPPING WEIGHT columns). Keep the column order exactly as in the template.

| # (1-based) | Header | Used as |
|---|---|---|
| 1 | CATEGORY IMAGE LOCATION | Category thumbnail filename (context rows) |
| 2 | PRODUCT CATEGORY | Parent category (SCREWS / NUTS / WASHERS) — context |
| 3 | PRODUCT SUB CATEGORY | Child category (e.g. HEX CAP SCREWS) — context |
| 4 | PART SERIES | Series term (e.g. MS35307) — context |
| 5 | **P/N** | SKU + product title. **Blank = context row** |
| 6 | DESCRIPTION | Short description |
| 7 | PACKAGE QTY | Pieces per package → `_pkg_qty` |
| 8 | SHIPPING DIMENSIONS HxWxL | Tier-1 box dims → **WC Shipping tab** (Shippo) |
| 9 | SHIPPING WEIGHT | Tier-1 weight → WC native `weight` |
| 10 | 1 PKG COST | Tier qty 1 price |
| 11 | 3 PKG COST | Tier qty 3 price |
| 12–13 | SHIPPING DIMENSIONS / WEIGHT | (3-pkg tier — informational, not imported) |
| 14 | 5 PKG COST | Tier qty 5 price |
| 15–16 | SHIPPING DIMENSIONS / WEIGHT | (5-pkg tier — informational) |
| 17 | 10 PKG COST | Tier qty 10 price |
| 18–19 | SHIPPING DIMENSIONS / WEIGHT | (10-pkg tier — informational) |
| 20 | QUANTITY IN STOCK | Blank → stock management off, "instock". Number → managed stock |
| 21 | BACKORDER LEADTIME | `_backorder_leadtime` |
| 22 | REORDER LIMIT | `_reorder_limit` (internal — not in public API) |
| 23 | COUNTRY OF ORIGIN | `pa_country` attribute |
| 24 | DFAR? | Y → `pa_specs_standard` = DFAR |
| 25 | MFR C OF C | Y/N → `_mfr_coc` |
| 26 | MATERIAL CERTS | Y/N → `_material_certs` |
| 27 | PROCESS CERTS | Y/N → `_process_certs` |
| 28 | TEST REPORTS | Y/N → `_test_reports` |
| 29 | MFR | `pa_manufacturer` attribute |
| 30 | LOT IN USE | `_lot_in_use` (internal) |
| 31 | COST PER EA | Internal cost reference |
| 32 | CERT LOCATION | `_cert_location` (internal) |
| 33 | PER PIECE WEIGHT | Fallback WC weight when tier-1 ship weight is blank |
| 34 | PRODUCT IMAGE | **Comma-separated filenames** — first = featured, rest = gallery |
| 35 | SPEC SHEET | Filename, full URL, or blank (SKU fallback `{SKU}-spec.pdf`) |
| 36 | CERTIFICATE | Filename, full URL, or blank (SKU fallback `{SKU}-cert.pdf`) |

Prices may include `$` and commas — they are stripped automatically.

## Context rows (category/series cascade)

A row with a **blank P/N** sets the active category + series context; every following product row inherits it until the next context row.

```csv
,SCREWS,HEX CAP SCREWS,MS35307,,,,...          ← context row
,,,,MS35307-303,"1/4-20 X 1/2 ...",50,...      ← product (inherits SCREWS > HEX CAP SCREWS > MS35307)
,,,,MS35307-306,"1/4-20 X 3/4 ...",50,...
,SCREWS,HEX CAP SCREWS,MS35308,,,,...          ← new context
```

## Media folders (Settings tab)

Files referenced by columns 34–36 are sideloaded from these folders into the Media Library. Folders **must be inside `wp-content/uploads/`** (paths outside uploads are rejected — path-traversal protection). Filenames are sanitized to their basename.

| Content | Default folder |
|---|---|
| Images | `uploads/product-images/` |
| Spec sheets | `uploads/product-specs/` |
| Certificates | `uploads/product-certs/` |

Already-imported files are reused by filename (no duplicates).

## What one product row creates

1. WC simple product — SKU, title, short description, regular price (tier-1)
2. `product_cat` assignment (deepest available level) + `product-series` term
3. Attributes: `pa_manufacturer`, `pa_country`, `pa_specs_standard`
4. Pricing tiers → ACF repeater `package_pricing_tiers` (admin UI) **and** `_package_pricing` meta (runtime)
5. WC weight + dimensions (tier-1 shipping data → Shippo)
6. Stock (managed only when column 20 has a number)
7. Featured image + gallery, spec/cert URLs, compliance + internal meta

Re-import with **"Update existing"** checked matches by SKU and updates in place.

## Manual editing after import

- **Pricing tiers**: product edit → "Spec Parts: Package Pricing" box (qty + price only; shipping lives in the WC Shipping tab)
- **Spec/Certificate**: Product data → General → "Spec Sheet (PDF)" / "Certificate (PDF)" — Upload/Select button opens the Media Library
- **Series**: Product Series checkbox panel (right sidebar)

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "Download sample CSV" → *template not found* | `import-template.csv` missing from theme root on the server — upload it |
| Products imported but sidebar unchanged | Pantheon Varnish (5-min TTL) or frontend ISR — Dashboard → Clear Caches, wait ≤5 min |
| Images not attached | Filename mismatch (case-sensitive) or file not in the configured uploads folder |
| Series in two taxonomies | Legacy imports used `product_series`; live uses `product-series`. All readers check both — harmless |
| Duplicate categories (two "FLAT WASHERS") | Import created same-name terms; APIs merge them and product queries match all duplicates |
