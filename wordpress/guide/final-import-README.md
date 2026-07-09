# Final Product Import — README

**Import file:** [`final-midwest-product.csv`](./final-midwest-product.csv) — 10 products, every column filled, ready to import.
**Full field reference:** [`client-import-guide.html`](./client-import-guide.html) — all 36 columns explained.

---

## 1. Folder Structure — Where Every File Goes

All media lives in the WordPress uploads directory, in three fixed folders.
Upload files **before** running the CSV import so the importer can attach them.

```
wp-content/uploads/
├── product-images/          ← product photos + category images (JPG / PNG / WEBP)
│   ├── screws.jpg               category image (CSV col 1, context row)
│   ├── nuts.jpg                 category image
│   ├── washers.jpg              category image
│   ├── MS35307-303.jpg          product photo (named by P/N)
│   ├── MS35307-306.jpg
│   └── ...
│
├── product-specs/           ← spec sheet PDFs (CSV col 35)
│   ├── MS35307-303-spec.pdf     named {P/N}-spec.pdf
│   ├── MS35307-306-spec.pdf
│   └── ...
│
└── product-certs/           ← certificate PDFs (CSV col 36)
    ├── MS35307-303-cert.pdf     named {P/N}-cert.pdf
    ├── MS35307-306-cert.pdf
    └── ...
```

| Folder | What goes in it | CSV column | Naming convention |
|---|---|---|---|
| `product-images/` | Product photos | 34 — PRODUCT IMAGE | `{P/N}.jpg` |
| `product-images/` | Category thumbnails | 1 — CATEGORY IMAGE LOCATION | `{category}.jpg` (e.g. `screws.jpg`) |
| `product-specs/` | Spec sheet PDFs | 35 — SPEC SHEET | `{P/N}-spec.pdf` |
| `product-certs/` | Certificate PDFs / images | 36 — CERTIFICATE | `{P/N}-cert.pdf` |

**Auto-matching:** if files follow the naming convention above, columns 34–36 can be
left blank in the CSV — the importer finds them by P/N automatically.

**Multiple photos:** comma-separate in col 34 — `MS35307-303.jpg, MS35307-303-side.jpg`.
First = main photo, rest = gallery.

---

## 2. What final-midwest-product.csv Contains

10 products across 3 categories / 4 part series:

| Category | Sub-Category | Series | Products | Category Image |
|---|---|---|---|---|
| SCREWS | HEX CAP SCREWS | MS35307 | MS35307-303 / -306 / -333 | screws.jpg |
| SCREWS | HEX CAP SCREWS | MS35308 | MS35308-303 / -363 | — (set above) |
| NUTS | HEX NUTS | MS35649 | MS35649-2252 / -2254 / -2256 | nuts.jpg |
| WASHERS | FLAT WASHERS | NAS1149 | NAS1149-F0332P / -F0432P | washers.jpg |

Every product row includes:

- **Pricing** — all 4 tiers (1 / 3 / 5 / 10 packages) with volume discounts
- **Shipping** — box dimensions `HxWxL` inches (col 8) + weight lbs (col 9)
  → stored in the **WooCommerce Shipping tab** (native fields), which is what
  **Shippo** reads for rate quotes. Not ACF.
- **Stock** — quantity in stock, backorder leadtime (`2-3 DAYS`), reorder limit
- **Compliance** — Country of Origin (USA), DFAR = Y, MFR C of C, Material /
  Process / Test certs = Y, manufacturer name
- **Internal-only** — lot number, cost per each, physical cert location
  (never shown to customers)
- **Piece weight** (col 33) — per-unit weight, fallback when shipping weight blank
- **Media** — product image, spec PDF, cert PDF (all named by P/N convention)

### Media files this CSV expects (upload first)

```
product-images/  →  screws.jpg, nuts.jpg, washers.jpg
                    MS35307-303.jpg   MS35307-306.jpg   MS35307-333.jpg
                    MS35308-303.jpg   MS35308-363.jpg
                    MS35649-2252.jpg  MS35649-2254.jpg  MS35649-2256.jpg
                    NAS1149-F0332P.jpg  NAS1149-F0432P.jpg

product-specs/   →  same 10 P/Ns as {P/N}-spec.pdf
product-certs/   →  same 10 P/Ns as {P/N}-cert.pdf
```

---

## 3. Import Steps

1. **Upload media** to the three folders above (SFTP, or Media → Add New)
2. **WooCommerce → Parts Import**
3. Choose `final-midwest-product.csv`
4. Click **Preview (no changes)** — check the report:
   - Missing media files show as `WARN: Image/Spec/Cert not found`
   - Missing shipping data shows as `WARN: No shipping dimensions/weight — Shippo cannot quote`
5. Fix warnings (usually a filename typo), preview again
6. Click **Import CSV**
7. Click **Backfill Product Series from SKU** — fills the sidebar series filter
8. If pricing tiers look empty on product edit screens:
   click **Sync Pricing Tiers to ACF (fix empty repeater)**

## 4. Where the Data Lands (system of record)

| Data | Stored in | Read by |
|---|---|---|
| Price tiers | `_package_pricing` meta + ACF repeater (edit UI) | Cart, REST API, frontend tables |
| Shipping weight / dims | WooCommerce native (Shipping tab) | **Shippo**, frontend |
| Stock | WooCommerce native inventory | Frontend stock notices, cart limits |
| Categories / series | WooCommerce taxonomies | Sidebar nav, category pages |
| Photos | WC featured image + gallery | Product pages, category grid |
| Spec / cert PDFs | `_spec_file_url` / `_certificate_file_url` meta | Product page download links |
| Internal (lot, cost, cert location) | Post meta only | Admin — never exposed via API |

## 5. Updating Later

Edit the same CSV → tick **"Update existing products"** → Preview → Import.
Products match by **P/N (SKU)**. Blank cells keep the current value; only filled
columns update. Products not in the file are untouched.
