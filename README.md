# Midwest Military Fasteners

Headless WordPress + Next.js frontend for Midwest Military.

## Quick Start (Clone & Run)

```bash
git clone https://github.com/kathan7424/midwest-military-fasteners.git
cd midwest-military-fasteners
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first run, `npm run dev` automatically creates `.env.local` from `.env.example`.

## Manual Setup

If you need custom environment variables:

```bash
npm run setup
```

Or copy manually:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_WP_API=https://dev-mmf-wp.pantheonsite.io/wp-json
NEXT_PUBLIC_WC_API=https://dev-mmf-wp.pantheonsite.io/wp-json/wc/v3
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run setup` | Create `.env.local` from `.env.example` |
| `npm run dev` | Setup env + start dev server |
| `npm run build` | Setup env + production build |
| `npm run start` | Start production server |

## Features

- WordPress-driven primary navigation
- Dynamic page routing via `[slug]`
- Header with logo and menu from WordPress API

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WP_API` | No* | WordPress REST API base URL |
| `NEXT_PUBLIC_WC_API` | No | WooCommerce REST API base URL |
| `NEXT_PUBLIC_SITE_URL` | No | Frontend site URL |

\* Defaults to dev WordPress URL if not set. For production, always set this in your hosting platform (Vercel, etc.).
