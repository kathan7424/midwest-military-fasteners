# Midwest Military Fasteners

Headless WordPress + Next.js frontend for Midwest Military.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```env
NEXT_PUBLIC_WP_API=https://dev-mmf-wp.pantheonsite.io/wp-json
NEXT_PUBLIC_WC_API=https://dev-mmf-wp.pantheonsite.io/wp-json/wc/v3
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Run development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- WordPress-driven primary navigation
- Dynamic page routing via `[slug]`
- Header with logo and menu from WordPress API
