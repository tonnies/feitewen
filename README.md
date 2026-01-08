# Feite Wen - South African News Website

A modern news website built with Astro, React, Tailwind CSS, and Notion as a CMS, deployed on Cloudflare Workers.

## Tech Stack

- **Framework**: Astro
- **Styling**: Tailwind CSS (Brutalist design with cream/off-white theme)
- **UI Components**: shadcn/ui components with React
- **CMS**: Notion
- **Hosting**: Cloudflare Workers

## Features

- Homepage with article grid and pagination
- Individual article pages with full content
- Topic filtering
- Search bar (UI ready, functionality to be added)
- About page (placeholder)
- Notion webhook integration for automatic rebuilds
- Brutalist design aesthetic

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd fw
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
```

### 4. Notion Setup

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the Internal Integration Token to use as `NOTION_API_KEY`
3. Share your Articles database with the integration

Your Articles database should have these properties:
- **Title** (title) - Article title
- **Slug** (rich_text) - URL slug
- **Publish Date** (date) - Publication date
- **Author** (people) - Author
- **Topic** (multi_select) - Tags/Categories
- **Excerpt** (rich_text) - Description
- **Status** (status) - Draft/Ready/Published
- **Why It Matters** (rich_text) - Additional context

### 5. Cloudflare Workers Setup

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`
3. Deploy the site: `npm run build && wrangler deploy`
4. Set environment variables: `wrangler secret put NOTION_API_KEY`
5. The cron trigger will automatically run every 40 minutes to refresh the cache

Or use Cloudflare Pages:
1. Create a Cloudflare Pages project
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set build output directory: `dist`
5. Add environment variables in Cloudflare settings

## Development

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:4321`

## Building

Build the project for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

The site is configured to deploy on Cloudflare Workers using SSR (Server-Side Rendering) mode. When you push to your main branch, Cloudflare will automatically build and deploy.

### Cache and Auto-Refresh

The site uses a **caching system** with automatic refresh:

1. **Cloudflare Cache API** - Caches Notion data for fast serving
2. **Cron Trigger** - Automatically refreshes cache every 40 minutes
3. **On-demand refresh** - Call `/api/webhook` (POST) to manually clear cache

How it works:
- First request fetches data from Notion and caches it
- Subsequent requests serve from cache (very fast)
- Every 40 minutes, the cron job invalidates the cache
- Next request after invalidation fetches fresh data from Notion

### Manual Cache Refresh

To manually refresh the cache:

```bash
curl -X POST https://your-domain.com/api/webhook
```

Only articles with status "Published" will appear on the site. Draft and Ready articles are excluded.

## Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ArticleCard.tsx
│   │   ├── Header.tsx
│   │   └── NotionBlocks.tsx
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── cache.ts
│   │   ├── notion.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── api/
│   │   │   ├── cron.ts
│   │   │   └── webhook.ts
│   │   ├── article/
│   │   │   └── [slug].astro
│   │   ├── about.astro
│   │   └── index.astro
│   ├── styles/
│   │   └── global.css
│   └── worker.ts
├── astro.config.mjs
├── package.json
└── wrangler.jsonc
```

## Topics

The following topics are available for filtering:
- Economics
- Electricity
- Politics
- Crime
- Community
- International
- Geopolitics
- Environment
- Education
- Sport
- Rugby
- Local Governance

## Design

The site uses a brutalist design aesthetic with:
- Cream/off-white background (#faf7f0)
- Black borders and text
- Bold, uppercase typography
- Monospace font
- Heavy shadows and borders
- Newspaper-inspired layout

## License

All rights reserved © 2026 Feite Wen
