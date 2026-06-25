# PROJECT CONCEPT GUIDE
## Midwest Military Fasteners — B2B Ecommerce Website

**Client:** Midwest Military Fasteners  
**Agency Partner:** build/create studios  
**Built by:** White Label IQ (WLIQ)  
**Developer:** KP-184  
**Project Start:** 2026-06-19

---

## What This Project Is

A headless B2B ecommerce website for Midwest Military Fasteners — a supplier of military-grade fasteners to defense contractors and government buyers. The site handles complex B2B workflows: quantity pricing tiers, Net 30 / Purchase Order payments, tax exemption management, and product certification tracking.

---

## Architecture

```
WordPress/WooCommerce (Pantheon) ←→ Next.js Frontend (React)
         Backend CMS + API                  Client-facing site
```

- **Backend:** WordPress + WooCommerce hosted on Pantheon (dev: `dev-mmf-wp.pantheonsite.io`)
- **Frontend:** Next.js 16.2.9 + React 19 + TypeScript + Tailwind CSS v4
- **Data flow:** Frontend fetches data from WooCommerce REST API and WP REST API at request time (SSR) or with ISR (5-min revalidation)
- **Rendering:** Server Components for layout/data fetching, Client Components for interactivity

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (no config file — uses `@import "tailwindcss"`) |
| State | Zustand v5 (global), TanStack React Query v5 (server state) |
| Forms | React Hook Form v7 + Zod v4 |
| HTTP | Axios v1 |
| Notifications | react-hot-toast |
| Icons | react-icons v5 |
| Compiler | React Compiler (babel-plugin-react-compiler) |
| Backend CMS | WordPress + WooCommerce on Pantheon |

---

## Brand Design

Figma File: `https://www.figma.com/design/hfxVmcFProBuFtCJeIwwfC/Midwest-Military-Fasteners`

### Colors

| Name | Hex | Usage |
|------|-----|-------|
| Amber / Gold | `#CC9900` | Primary accent, H2 headings, CTA buttons, hero bg |
| Navy Dark | `#1A3659` | Primary brand navy, header bg (logged-in) |
| Blue Medium | `#336699` | H1 heading color, links |
| Near Black | `#14151C` | H3, H4 headings, body text on light bg |
| Dark Gray | `#333333` | Secondary text |
| Medium Gray | `#737373` | Placeholder, muted text |
| Light Gray | `#EEEEEE` | Borders, dividers, card backgrounds |
| Off White | `#FAFAFA` | Page background |
| White | `#FFFFFF` | Card bg, nav text on dark headers |
| Black | `#000000` | High-contrast headings, footer text |

### Typography

**Font Family: Open Sans** (all weights)

| Element | Weight | Size | Line Height | Color |
|---------|--------|------|-------------|-------|
| H1 | Bold | 60px | 110% | `#336699` |
| H2 | Bold | 40px | 110% | `#CC9900` |
| H3 | Bold | 32px | 110% | `#14151C` |
| H4 | Bold | 24px | 110% | `#14151C` |
| Section Title (e.g. "Your First & Final Stop...") | ExtraBold | 30px | 120% | `#000000` |
| Category Label (e.g. SCREWS, NUTS) | Bold | 18px | 197% | `#FFFFFF` |
| Body / Paragraph | Regular | 18px | 120% | `#000000` |
| Nav / Sub-category Links | Regular | 16px | 197% | `#FFFFFF` |

### CSS Variables to Add in `globals.css`

```css
:root {
  /* Brand Colors */
  --color-amber:       #CC9900;
  --color-navy:        #1A3659;
  --color-blue:        #336699;
  --color-near-black:  #14151C;
  --color-dark-gray:   #333333;
  --color-mid-gray:    #737373;
  --color-light-gray:  #EEEEEE;
  --color-off-white:   #FAFAFA;

  /* Typography */
  --font-sans: 'Open Sans', sans-serif;
}
```

Add to `layout.tsx`: import Open Sans from Google Fonts or via `next/font/google`.

---

## Key B2B Features (Planned)

- **Quantity-based pricing tiers** — 1 / 3 / 5 / 10 package pricing per SKU
- **Net 30 / Purchase Order payments** — business account invoicing
- **Tax exemption management** — upload/manage exemption certificates
- **Product certifications** — MIL-SPEC cert display per product
- **Account dashboard** — order history, reorder, invoice download
- **Stripe** — card payments
- **Shippo** — shipping rate calculation
- **TaxJar** — sales tax automation

---

## Page Structure (from Figma)

| Page | Route | Status |
|------|-------|--------|
| Home | `/` | Placeholder only |
| Product Catalog | `/catalog` | Not built |
| Product Detail | `/product/[slug]` | Not built |
| Cart | `/cart` | Not built |
| Checkout | `/checkout` | Not built |
| Login / Register | `/login` | Not built |
| My Account | `/account` | Not built |
| Certifications | `/certifications` | Not built |
| CMS Pages (About, Quality, Contact) | `/[slug]` | Routing works, content from WP |

---

## Environment Config

Env vars are centralized in `src/config/env.ts`:

```ts
WP_API  = NEXT_PUBLIC_WP_API  ?? "https://dev-mmf-wp.pantheonsite.io/wp-json"
WC_API  = NEXT_PUBLIC_WC_API  ?? "https://dev-mmf-wp.pantheonsite.io/wp-json/wc/v3"
SITE_URL = NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
```

Run `npm run setup` or `npm run dev` — the setup script auto-generates `.env.local` if missing.

---

## Header States (Two Variants — from Figma)

1. **Logged-out header** — Logo + nav links + Login/Register CTAs (current `Header.tsx`)
2. **Logged-in header** — Logo + nav links + Cart icon + Account dropdown (`Loginheader.tsx` — not implemented)
