# PROJECT INSTRUCTIONS
## Midwest Military Fasteners — Developer Guide

---

## Getting Started

```bash
npm install
npm run dev       # auto-generates .env.local and starts Next.js dev server
```

Runs at: `http://localhost:3000`

---

## Folder Structure

```
src/
├── app/
│   ├── (website)/              # Main site route group
│   │   ├── layout.tsx          # Wraps all pages with Header + Footer
│   │   ├── page.tsx            # Homepage (placeholder — needs Figma implementation)
│   │   └── [slug]/page.tsx     # Dynamic CMS pages from WordPress
│   ├── api/
│   │   └── menu/route.ts       # Internal proxy for WP menu API
│   ├── globals.css             # Tailwind v4 import + CSS variables
│   └── layout.tsx              # Root layout (fonts, metadata)
│
├── components/
│   └── layout/
│       ├── Header/             # Async server component — fetches WP menu
│       ├── Navbar/             # Desktop nav links (needs mobile/responsive work)
│       ├── Loginheader/        # Logged-in header variant (NOT implemented)
│       ├── Footer/             # 3-column footer (does NOT match Figma — needs rebuild)
│       └── Sidebar/            # Category sidebar (NOT implemented)
│   └── pages/
│       └── WpPageContent/      # Renders raw WordPress page HTML
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

- **Header is NOT responsive** — Navbar has no mobile breakpoints, no hamburger menu. Fix before any page goes live.
- **Footer does NOT match Figma** — current footer is a generic placeholder. Needs full rebuild.
- **globals.css has no brand colors** — only default white/dark theme vars. Brand tokens not added yet.
- **Homepage is a placeholder** — just renders `<h1>Home Page</h1>`. Full Figma design not implemented.
- **Loginheader.tsx and Sidebar.tsx are empty files** — scaffolded but not built.
- **next@16.2.9** — double-check this is the correct version (standard Next.js is in the 14.x–15.x range; 16.x may be a custom/future version).
