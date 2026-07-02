# PROJECT INSTRUCTIONS
## Midwest Military Fasteners — Developer Guide

---

## Getting Started

```bash
npm install --include=dev    # see warning below
npm run dev                  # auto-generates .env.local and starts Next.js dev server
```

Runs at: `http://localhost:3000`

> ⚠️ **Install with `--include=dev`.** `NODE_ENV=production` is set machine-wide on the current dev environment, which makes npm run with `omit=dev`. A plain `npm install` then **strips devDependencies** (`@tailwindcss/postcss`, `tailwindcss`, `typescript`, `@types/node`) and breaks the build (Tailwind/CSS 500 errors). Always use `npm install --include=dev`, or remove the global `NODE_ENV`.

---

## Folder Structure

```
src/
├── app/
│   ├── (website)/              # Main site route group
│   │   ├── layout.tsx          # Wraps all pages with Header + Footer
│   │   ├── page.tsx            # Homepage
│   │   ├── product/
│   │   │   ├── page.tsx        # Product listing (/product)
│   │   │   └── [series]/[partNumber]/page.tsx   # Product detail (/product/MS35307/MS35307-303)
│   │   └── [slug]/page.tsx     # Dynamic CMS pages from WordPress
│   ├── api/
│   │   └── menu/route.ts       # Internal proxy for WP menu API
│   ├── globals.css             # Tailwind v4 import + CSS variables
│   └── layout.tsx              # Root layout (fonts, metadata)
│
├── components/
│   ├── ui/                     # shadcn/ui primitives + custom DataTable (accordion, table, sheet, button, data-table)
│   ├── shared_Ui/              # Cross-page reusable widgets (Breadcrumb, IsoSection, QtyAddToOrder)
│   ├── layout/
│   │   ├── Header/             # Async server component — fetches WP menu
│   │   ├── Navbar/             # Desktop nav links (needs mobile/responsive work)
│   │   ├── Loginheader/        # Logged-in header (logo + search + YOUR ORDER)
│   │   ├── MobileMenu/         # Mobile hamburger menu
│   │   ├── Footer/             # Copyright + legal-links amber bar (ISO now lives in shared_Ui)
│   │   └── Sidebar/            # Accordion category nav (Sidebar, SidebarGroup, SidebarItem, sidebarData.ts, types.ts)
│   └── pages/
│       ├── Home/               # Homepage (Hero + IsoSection)
│       ├── Product/            # Product listing (ProductPage, ProductTable, productData.ts, index.ts)
│       ├── ProductDetail/      # Product detail (ProductDetailPage, ProductSpecTable, index.ts)
│       └── WpPageContent/      # Renders raw WordPress page HTML
│
├── lib/
│   └── utils.ts                # cn() class-merge helper (clsx + tailwind-merge)
│
├── config/
│   └── env.ts                  # Centralized env vars with fallback defaults
│
├── services/
│   ├── menu.service.ts         # Fetches WP primary menu (no-store cache)
│   └── page.service.ts         # Fetches WP pages by slug (5-min ISR)
│
├── types/
│   ├── menu.types.ts           # MenuItem interface
│   └── page.types.ts           # WP page response types
│
└── utils/
    └── menu.utils.ts           # normalizeMenu(), getSlugFromPath(), findMenuItemBySlug()
```

---

## Coding Standards

Every file must include this header comment block:

```tsx
/**
 * File Name: FileName.tsx
 * Description: Brief description of what this component does
 * Developer: KP-184
 * Created Date: YYYY-MM-DD
 * Last Modified: YYYY-MM-DD
 */
```

---

## Component Rules

- **Server Components** — use for anything that fetches data (Header, page layouts, product listings). No `"use client"` unless interactivity is needed.
- **Client Components** — use for interactive UI (hamburger menu toggle, cart quantity, modals). Add `"use client"` directive at the top.
- **No direct `fetch()` in components** — all data fetching goes through `src/services/`. Components call service functions.
- **No hardcoded API URLs** — always import from `src/config/env.ts`.

---

## Styling Rules

- **Tailwind CSS v4** — no `tailwind.config.js`. Add custom tokens via `@theme` in `globals.css`.
- **Brand colors** must be defined as CSS variables in `globals.css` under `:root`:
  ```css
  --color-amber:      #CC9900;   /* Primary accent, CTA buttons, hero bg */
  --color-navy:       #1A3659;   /* Dark navy, header bg */
  --color-blue:       #336699;   /* H1, links */
  --color-near-black: #14151C;   /* H3, H4, dark body text */
  --color-dark-gray:  #333333;   /* Secondary text */
  --color-mid-gray:   #737373;   /* Muted / placeholder */
  --color-light-gray: #EEEEEE;   /* Borders, dividers */
  --color-off-white:  #FAFAFA;   /* Page background */
  ```
- **Responsive breakpoints** (Tailwind defaults):
  - `sm` → 640px
  - `md` → 768px
  - `lg` → 1024px
  - `xl` → 1280px
  - `2xl` → 1536px
- **Mobile-first** — write base styles for mobile, add `md:` / `lg:` overrides for larger screens.
- **Use token utilities, not hardcoded hex** — prefer `bg-navy`, `text-blue`, `text-mid-gray`, `font-condensed` (auto-generated from `@theme`). Only use an arbitrary value (e.g. `border-[#4F5965]`) when the color genuinely isn't a token.
- **Override component styles via the `className` prop** — shared components (`IsoSection`, `QtyAddToOrder`, `Breadcrumb`) merge `className` through `cn()` (clsx + tailwind-merge), so a caller class wins over the base on the same axis. Example: `<IsoSection className="pb-[18px] md:justify-start" />` overrides the base bottom padding and justification. Don't fork a component just to tweak spacing/alignment.

---

## Components Architecture

Three tiers — put each new component in the right one:

- **`components/ui/`** — shadcn/ui primitives + the custom generic `DataTable`. Add primitives with `npx shadcn@latest add <name>`. shadcn is initialized (`components.json`, style `base-nova`, base color `neutral`, `cn()` in `lib/utils.ts`). Don't hand-edit generated primitives unless necessary.
- **`components/shared_Ui/`** — small **cross-page** reusable widgets that aren't layout and aren't page-specific (`Breadcrumb`, `IsoSection`, `QtyAddToOrder`). Reuse these instead of re-writing markup on each page.
- **`components/pages/<PageName>/`** — page-specific composition. Convention: a `<PageName>Page.tsx` (composes everything), any sub-components, and an `index.ts` barrel export. The route file (`app/(website)/.../page.tsx`) only imports and renders the page component.

---

## ISO Section

- The ISO 9001:2015 trust block is **not** in the Footer anymore. Render it per page with `<IsoSection />` from `components/shared_Ui/`.
- Props: `align="center" | "left"` (default `center`) + `className`. Home uses `center`; product pages use `left` and bottom-align it with `mt-auto`.
- Do **not** add it to CMS pages (`/[slug]`) — intentionally omitted there.

---

## Mock Data (frontend-first pattern)

Frontend is built with mock data; the backend developer swaps in the real API later. Follow this so the swap is clean:

- Keep mock data in a dedicated `*Data.ts` file, not inline in components — e.g. `pages/Product/productData.ts` (`MOCK_PRODUCTS`, `HERO`, `getProductByPartNumber()`), `layout/Sidebar/sidebarData.ts` (`SIDEBAR_DATA`).
- Keep the exported **shape/types stable** (the `Product`, `SidebarCategory` interfaces) — the backend replaces the data source, not the shape.
- Provide lookup helpers (e.g. `getProductByPartNumber()`) so pages don't reach into the array directly.

---

## Product Routing

- **Listing:** `/product` → `pages/Product/ProductPage.tsx` (currently static MS35307).
- **Detail:** `/product/[series]/[partNumber]` (e.g. `/product/MS35307/MS35307-303`) → `pages/ProductDetail/ProductDetailPage.tsx`.
- Route params are async in Next 16 — `const { series, partNumber } = await params;` and call `notFound()` when the product isn't found.
- The listing's P/N cell links to the detail route; keep that link in sync if the URL scheme changes.

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /wp-json/custom/v1/menu/primary` | Primary navigation menu |
| `GET /wp-json/wp/v2/pages?slug={slug}` | WordPress CMS page by slug |
| `GET /wp-json/wc/v3/products` | WooCommerce products (to be used) |
| `GET /wp-json/wc/v3/products/{id}` | Single product (to be used) |
| `GET /wp-json/wc/v3/cart` | Cart (to be used) |

WooCommerce API requires Basic Auth (Consumer Key + Secret) — store in env vars, never hardcode.

---

## Adding New Pages

1. Create a service function in `src/services/` for any new API call.
2. Create the page at `src/app/(website)/your-page/page.tsx`.
3. Build the UI component in `src/components/pages/YourPage/`.
4. Match the Figma design — check the Figma file for exact layout, colors, and spacing.

---

## Figma Reference

Always check Figma before building any component:  
`https://www.figma.com/design/hfxVmcFProBuFtCJeIwwfC/Midwest-Military-Fasteners`

Pages in Figma:
- **Home** — full landing page with hero, features, CTA sections
- **Catalog** — product grid with sidebar filters
- **Product** — detail page with pricing tiers, certifications, add-to-cart
- **Product-Cart Hover** — cart drawer/flyout state
- **Login/Register** — combined auth page
- **My Account** — dashboard with orders, invoices, profile
- **View Cart** — full cart page
- **Certifications** — product cert listing page

---

## Known Issues / Watch-Outs

- **Header responsiveness** — `MobileMenu.tsx` now exists; verify hamburger + `hidden md:flex` on Navbar are wired and correct before go-live.
- **Homepage not final** — renders `<Hero />` + shared `<IsoSection />`, but the full Figma Home design is not implemented yet.
- **`Loginheader.tsx`** — built (logo + search + YOUR ORDER → `/cart`), but the order-count badge is static (no cart state yet).
- **Product pages use mock data** — `/product` and `/product/[series]/[partNumber]` render from `productData.ts` / `sidebarData.ts`; not yet wired to WooCommerce.
- **`Add to Order` / cart not functional** — `QtyAddToOrder` is presentational only; no Zustand cart store or `/cart` page yet.
- **Pre-existing TS error** — `Loginheader.tsx` has a `Promise<MenuItem[]>` typing error unrelated to the product work.
- **next@16.2.9** — double-check this is the correct version (standard Next.js is in the 14.x–15.x range; 16.x may be a custom/future version).

**Resolved since last update:** brand color tokens added to `globals.css`; Footer rebuilt (copyright bar + ISO moved to shared component); Sidebar built.
