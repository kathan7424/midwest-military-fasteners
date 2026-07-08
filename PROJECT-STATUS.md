# PROJECT STATUS
## Midwest Military Fasteners — Build Tracker

**Last Updated:** 2026-07-08
**Developers:** Jaimin, pod2

**Overall Status:** 🔄 In Progress — Core auth UI pages and shared form styling are now implemented; product/cart/backend integration remains the next priority.

---

## Legend
- ✅ Done
- 🔄 In Progress
- ⚠️ Needs Fix
- ❌ Not Started

---

## Foundation / Scaffolding

| Item | Status | Notes |
|------|--------|-------|
| Next.js project setup | ✅ Done | Next 16.2.9, React 19, TypeScript, Tailwind v4 |
| Folder structure | ✅ Done | `app/`, `components/`, `services/`, `types/`, `utils/`, `lib/` |
| Env config (`env.ts`) | ✅ Done | Fallback defaults to Pantheon dev URLs |
| `.env.local` setup script | ✅ Done | `npm run setup` or `npm run dev` auto-generates |
| Route group `(website)` | ✅ Done | Layout wraps Header + Footer around all pages |
| Dynamic CMS page routing | ✅ Done | `[slug]/page.tsx` reads from WordPress |
| WP menu service | ✅ Done | Fetches from `custom/v1/menu/primary` |
| WP page service | ✅ Done | Fetches by slug with 5-min ISR |
| Menu utilities | ✅ Done | `normalizeMenu()`, `getSlugFromPath()`, `findMenuItemBySlug()` |
| Internal menu API route | ✅ Done | `/api/menu` proxies WP menu |
| shadcn/ui initialized | ✅ Done | `components.json` (style `base-nova`, base color `neutral`), `lib/utils.ts` (`cn`) |

---

## Layout Components

| Component | Status | Notes |
|-----------|--------|-------|
| Header (server component) | 🔄 In Progress | Modified since last update — added HeaderCart hover preview and refined search/header layout; verify mobile breakpoints |
| Navbar | 🔄 In Progress | Modified — verify hamburger / `hidden md:flex` |
| MobileMenu / Hamburger | 🔄 In Progress | Component now exists (`MobileMenu.tsx`) — verify wiring |
| Loginheader (logged-in state) | 🔄 In Progress | Built — logo + search + YOUR ORDER (→ `/cart`); order-count badge is static |
| Footer | ✅ Done | Refactored — ISO block removed (moved to shared `IsoSection`); copyright + legal-links amber bar remains |
| Sidebar (category nav) | ✅ Done | Full accordion sidebar built — see Product Listing section |

---

## Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Homepage | `/` | ⚠️ Needs Fix | Hero + shared ISO section present; full Figma design not built |
| CMS Pages (About, Quality, Contact) | `/[slug]` | ✅ Done | Renders WP page content (no ISO section, by design) |
| **Product Listing (MS35307)** | `/product` | ✅ Done | Frontend built with mock data — see section below |
| **Product Detail** | `/product/[series]/[partNumber]` | ✅ Done | **Frontend built with mock data — see section below** |
| Product Catalog | `/catalog` | ❌ Not Started | — |
| Cart | `/cart` | ❌ Not Started | Planned — deferred (see Next Steps) |
| Checkout | `/checkout` | ❌ Not Started | — |
| Login / Register / Forgot Password | `/login`, `/register`, `/forgot-password` | 🔄 In Progress | Auth UI screens are built and styled; API wiring and final validation flow still need verification |
| My Account | `/account` | ❌ Not Started | — |
| Certifications | `/certifications` | ❌ Not Started | — |

---

## Recent Implementation Updates (2026-07-08)

### New Files
| File | Type | Notes |
|------|------|-------|
| `src/components/pages/Auth/LoginButton.tsx` | New | Custom button component used on login, register, and forgot-password forms |

### Updated / Modified Files
| File | Type | Notes |
|------|------|-------|
| `src/components/pages/Auth/LoginPanel.tsx` | Updated | Custom button, form input styling, and focus-ring cleanup |
| `src/components/pages/Auth/ForgotPasswordPanel.tsx` | Updated | Matched login-page styling and button treatment |
| `src/components/pages/Auth/RegisterPanel.tsx` | Updated | Register form input styling, upload field styling, date-picker styling, and button treatment |
| `src/components/pages/Auth/SalesTaxExemptionUpload.tsx` | Updated | Upload field styled to match other auth inputs |
| `src/components/application/date-picker/date-picker.tsx` | Updated | Added placeholder support and trigger button class support for square styling |
| `src/app/(website)/login/page.tsx` | Updated | Adjusted login page container width |
| `src/app/(website)/register/page.tsx` | Updated | Register page continues to use the updated auth panel |

### About Page (2026-07-08)
#### New Files
| File | Type | Notes |
|------|------|-------|
| `src/components/pages/About/AboutAccordion.tsx` | New | Page-scoped Figma-styled accordion used only on About page to avoid affecting sidebar/product accordions |

#### Updated / Modified Files
| File | Type | Notes |
|------|------|-------|
| `src/components/pages/About/AboutPage.tsx` | Updated | Rebuilt responsive About page: hero, overview, highlights, and FAQ; responsive stacking at `lg` breakpoint; uses `AboutAccordion` for FAQ |
| `src/components/ui/accordion.tsx` | Updated (reverted) | Temporarily adjusted for Figma look then restored to original shared styling to avoid site-wide changes |

### Current Focus
- Finish and verify the auth form flow end-to-end
- Continue cart and product-data integration next
- Keep shared auth UI components consistent across login, register, and forgot-password flows

---

## Styling / Brand

| Item | Status | Notes |
|------|--------|-------|
| Tailwind v4 setup | ✅ Done | `@import "tailwindcss"` + `tw-animate-css` in globals.css |
| Brand color tokens in CSS | ✅ Done | `@theme` tokens: navy, amber, blue, near-black, grays, etc. |
| Typography setup | ✅ Done | Open Sans (+ condensed) + font sizes/weights defined as `@theme` tokens |
| Component responsive styles | 🔄 In Progress | Product listing + detail fully responsive (Sheet drawer); other components pending |

---

## Shared UI (`components/shared_Ui/`) — reused across pages

| Component | Purpose |
|-----------|---------|
| `Breadcrumb.tsx` | Generic breadcrumb (items array; last = bold current page) |
| `IsoSection.tsx` | ISO 9001:2015 trust block; `align="left" \| "center"` prop; matches old Footer styling |
| `QtyAddToOrder.tsx` | QTY input + Add to Order button; `size="sm"` (table rows) / `"lg"` (detail) |

ISO note: the ISO block was removed from `Footer.tsx` and is now rendered per page via `<IsoSection />` — centered on Home, left-aligned + bottom-aligned (`mt-auto`) on the product pages.

---

## Product Listing Page (`/product`) — 2026-07-01

Full frontend build of the Hex Cap Screws (MS35307) catalog view. **Data is mock** — ready for backend to wire to API/CMS.

### Features
| Feature | Status | Notes |
|---------|--------|-------|
| Responsive layout | ✅ Done | Desktop sidebar + main; mobile/tablet collapses into slide-out Sheet drawer |
| Accordion category sidebar | ✅ Done | SCREWS / NUTS / WASHERS → expandable groups → part-series links + active state |
| Product data table | ✅ Done | Sortable P/N (links to detail), description, 1/3/5/10 Pkg pricing, MFR, country, spec download, QTY + Add to Order |
| Client-side filter | ✅ Done | Live text filter over P/N + description |
| ISO 9001:2015 section | ✅ Done | Shared `<IsoSection align="left" />`, bottom-aligned |
| Route wiring | ✅ Done | `src/app/(website)/product/page.tsx` |

---

## Product Detail Page (`/product/[series]/[partNumber]`) — 2026-07-01

Single-product detail view (e.g. `/product/MS35307/MS35307-303`). **Frontend + mock data only** — backend wires real API later.

### Features
| Feature | Status | Notes |
|---------|--------|-------|
| Nested dynamic route | ✅ Done | `[series]/[partNumber]`; `getProductByPartNumber()` lookup + `notFound()` fallback |
| Responsive sidebar shell | ✅ Done | Same desktop sidebar + mobile Sheet drawer as listing |
| Hero (title / description / image) | ✅ Done | Image fixed at 298×199 per Figma |
| QTY + Add to Order (lg) | ✅ Done | 2px `#4F5965` border, 20px condensed button — matches Figma |
| Vertical spec table | ✅ Done | P/N, SKU, Description, Pkg Qty, 1/3/5/10 Pkg, MFR, Spec Sheet (download + legacy note); blue (#336699) label column |
| ISO 9001:2015 section | ✅ Done | Shared `<IsoSection align="left" />`, bottom-aligned |
| Listing → detail navigation | ✅ Done | Listing P/N cell now links to the detail route |

### Components created (Product Detail + Sidebar)
| File | Purpose |
|------|---------|
| `src/app/(website)/product/[series]/[partNumber]/page.tsx` | Detail route (async params) |
| `src/components/pages/ProductDetail/ProductDetailPage.tsx` | Composes sidebar + hero + QTY/order + spec table + ISO |
| `src/components/pages/ProductDetail/ProductSpecTable.tsx` | Vertical spec table |
| `src/components/pages/ProductDetail/index.ts` | Barrel exports |
| `src/components/pages/Product/productData.ts` | Shared mock data (`MOCK_PRODUCTS`, `HERO`) + `getProductByPartNumber()` |
| `src/components/ui/accordion.tsx` / `table.tsx` / `data-table.tsx` / `sheet.tsx` / `button.tsx` | shadcn primitives + custom DataTable |
| `src/components/layout/Sidebar/*` | `Sidebar`, `SidebarGroup`, `SidebarItem`, `sidebarData.ts`, `types.ts` |

### Data model
- `Product` type gained a `sku` field; mock data centralized in `productData.ts`.

---

## Libraries added

| Library | Version | Purpose |
|---------|---------|---------|
| `@tanstack/react-table` | 8.21.3 | Data table engine |
| `@base-ui/react` | 1.6.0 | Primitives behind accordion / sheet |
| `lucide-react` | 1.21.0 | Icons (Filter, Download, ArrowUpDown) |
| `class-variance-authority` | 0.7.1 | shadcn variant styling |
| `tailwind-merge` | 3.6.0 | `cn()` class merging (drives `IsoSection` className overrides) |
| `tw-animate-css` | 1.4.0 | Accordion / sheet animations |

### Assets added
- `public/images/hex-cap-screws.webp`
- `public/images/hero-bg-banner.webp`

### Backend integration points (replace mock → API)
- `MOCK_PRODUCTS` + `HERO` in `Product/productData.ts` (product rows, pricing, hero copy)
- `getProductByPartNumber()` in `Product/productData.ts` (detail lookup)
- `SIDEBAR_DATA` in `Sidebar/sidebarData.ts` (category tree)

---

## B2B / WooCommerce Features

| Feature | Status | Notes |
|---------|--------|-------|
| Product listing API | ❌ Not Started | WC `/products` endpoint |
| Product detail API | ❌ Not Started | WC `/products/{id}` |
| Quantity pricing tiers | 🔄 In Progress | UI built (1/3/5/10 pkg on listing + detail); no API yet |
| Cart store + Add to Order wiring | ❌ Not Started | Zustand store planned; buttons are static |
| Cart API | ❌ Not Started | WC cart endpoints |
| Checkout flow | ❌ Not Started | — |
| Net 30 / PO payment | ❌ Not Started | — |
| Tax exemption management | ❌ Not Started | Cart page will show the "document expiring" banner |
| Product certifications display | ❌ Not Started | — |
| User auth (login/register) | ❌ Not Started | — |
| Account dashboard | ❌ Not Started | Order history, invoices |

---

## Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Stripe (card payments) | ❌ Not Started | — |
| Shippo (shipping rates) | ❌ Not Started | — |
| TaxJar (tax automation) | ❌ Not Started | — |

---

## Environment Notes

- ⚠️ `NODE_ENV=production` is set machine-wide on the current dev environment. This makes npm run with `omit=dev`, so a plain `npm install` **strips devDependencies** (`@tailwindcss/postcss`, `tailwindcss`, `typescript`, `@types/node`) and breaks the build. **Always install with `npm install --include=dev`** (or remove the global `NODE_ENV`).
- One pre-existing TypeScript error remains in `Loginheader.tsx` (Promise/MenuItem typing) — unrelated to the product pages.

---

## Immediate Next Steps (Priority Order)

1. **Cart store + Add to Order wiring** — Zustand store, wire listing/detail buttons, header order-count badge *(deferred from this pass)*
2. **Build Cart page** (`/cart`) — line items, QTY, remove, tax-exemption banner, Checkout *(deferred)*
3. **Wire `/product` + detail to real data** — replace `MOCK_PRODUCTS` / `SIDEBAR_DATA` with WC/API data
4. **Fix Header responsiveness** — verify hamburger menu + `hidden md:flex` on Navbar
5. **Build Homepage** — implement full Figma Home page design
6. **Build Login/Register page** — auth flow
