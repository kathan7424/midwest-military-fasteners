# PROJECT STATUS
## Midwest Military Fasteners — Build Tracker

**Last Updated:** 2026-06-24  
**Developer:** KP-184

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
| Folder structure | ✅ Done | `app/`, `components/`, `services/`, `types/`, `utils/` |
| Env config (`env.ts`) | ✅ Done | Fallback defaults to Pantheon dev URLs |
| `.env.local` setup script | ✅ Done | `npm run setup` or `npm run dev` auto-generates |
| Route group `(website)` | ✅ Done | Layout wraps Header + Footer around all pages |
| Dynamic CMS page routing | ✅ Done | `[slug]/page.tsx` reads from WordPress |
| WP menu service | ✅ Done | Fetches from `custom/v1/menu/primary` |
| WP page service | ✅ Done | Fetches by slug with 5-min ISR |
| Menu utilities | ✅ Done | `normalizeMenu()`, `getSlugFromPath()`, `findMenuItemBySlug()` |
| Internal menu API route | ✅ Done | `/api/menu` proxies WP menu |

---

## Layout Components

| Component | Status | Notes |
|-----------|--------|-------|
| Header (server component) | ⚠️ Needs Fix | Built, but **NOT responsive** — no mobile breakpoints |
| Navbar | ⚠️ Needs Fix | Desktop only — no hamburger menu, no `hidden md:flex` |
| MobileMenu / Hamburger | ❌ Not Started | Needs new component + toggle logic |
| Loginheader (logged-in state) | ❌ Not Started | File exists but is empty |
| Footer | ⚠️ Needs Fix | Generic placeholder — **does NOT match Figma** |
| Sidebar (category nav) | ❌ Not Started | File exists but is empty |

---

## Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Homepage | `/` | ⚠️ Needs Fix | Placeholder `<h1>Home Page</h1>` — full Figma design not built |
| CMS Pages (About, Quality, Contact) | `/[slug]` | ✅ Done | Renders WP page content |
| Product Catalog | `/catalog` | ❌ Not Started | — |
| Product Detail | `/product/[slug]` | ❌ Not Started | — |
| Cart | `/cart` | ❌ Not Started | — |
| Checkout | `/checkout` | ❌ Not Started | — |
| Login / Register | `/login` | ❌ Not Started | — |
| My Account | `/account` | ❌ Not Started | — |
| Certifications | `/certifications` | ❌ Not Started | — |

---

## Styling / Brand

| Item | Status | Notes |
|------|--------|-------|
| Tailwind v4 setup | ✅ Done | `@import "tailwindcss"` in globals.css |
| Brand color tokens in CSS | ❌ Not Started | Exact colors confirmed from Figma — see PROJECT-CONCEPT-GUIDE.md |
| Typography setup | ❌ Not Started | Font: **Open Sans** — needs `next/font/google` in `layout.tsx` |
| Component responsive styles | ❌ Not Started | Only header/navbar scaffolded with no breakpoints |

---

## B2B / WooCommerce Features

| Feature | Status | Notes |
|---------|--------|-------|
| Product listing API | ❌ Not Started | WC `/products` endpoint |
| Product detail API | ❌ Not Started | WC `/products/{id}` |
| Quantity pricing tiers | ❌ Not Started | 1 / 3 / 5 / 10 pkg pricing |
| Cart API | ❌ Not Started | WC cart endpoints |
| Checkout flow | ❌ Not Started | — |
| Net 30 / PO payment | ❌ Not Started | — |
| Tax exemption management | ❌ Not Started | — |
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

## Immediate Next Steps (Priority Order)

1. **Fix Header responsiveness** — add hamburger menu + `hidden md:flex` on Navbar
2. **Apply brand colors** — add navy + amber CSS tokens to `globals.css`
3. **Rebuild Footer** — match Figma layout, colors, links
4. **Build Homepage** — implement full Figma Home page design
5. **Build Loginheader** — logged-in header state with cart icon + account dropdown
6. **Build Sidebar** — category filter nav for catalog
7. **Build Product Catalog page** — wire up WC products API
8. **Build Product Detail page** — pricing tiers, certs, add-to-cart
9. **Build Cart page** — line items, totals, proceed to checkout
10. **Build Login/Register page** — auth flow
