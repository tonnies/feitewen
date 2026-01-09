# Feite Wen - South African News Website

A modern news website built with Astro, React, Tailwind CSS, and Notion as a CMS, deployed on Cloudflare Workers.

## Tech Stack

- **Framework**: Astro (SSR mode)
- **Database**: Cloudflare D1 (SQLite)
- **Styling**: Tailwind CSS (Brutalist design with cream/off-white theme)
- **UI Components**: shadcn/ui components with React
- **CMS**: Notion (synced to D1 via background worker)
- **Hosting**: Cloudflare Workers/Pages
- **Search**: SQLite FTS5 (Full-Text Search)

## Features

- ⚡ **Lightning-fast page loads** with Cloudflare D1 database (10-50ms)
- 🔍 **Full-text search** across all articles
- 📰 **Homepage** with article grid and pagination
- 📄 **Individual article pages** with full content and related articles
- 🏷️ **Topic filtering** across 12 news categories
- 🔄 **Automatic sync** from Notion to D1 every 10 minutes
- 🎨 **Brutalist design** aesthetic
- 📱 **Fully responsive** mobile-first design

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

### 5. Cloudflare D1 Database Setup

**⚠️ IMPORTANT**: This site now uses Cloudflare D1 database for fast page loading.

See **[D1_SETUP.md](./D1_SETUP.md)** for complete setup instructions.

Quick setup:
```bash
# 1. Create D1 database
wrangler d1 create feitewen-test

# 2. Update wrangler.toml with database_id

# 3. Run migrations
wrangler d1 execute feitewen-test --file=./migrations/0001_create_articles_table.sql --remote

# 4. Set secrets
wrangler secret put NOTION_API_KEY
wrangler secret put NOTION_DATABASE_ID

# 5. Deploy sync worker
wrangler deploy src/workers/sync.ts

# 6. Initial sync
curl -X POST https://YOUR-WORKER-URL.workers.dev/sync
```

### 6. Deploy to Cloudflare Pages

```bash
# Build and deploy
npm run build
wrangler pages deploy dist
```

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

The site is configured to deploy on Cloudflare Workers/Pages using SSR (Server-Side Rendering) mode.

### Architecture

```
Notion CMS → Sync Worker (cron: every 10 min) → D1 Database → Astro SSR → User
```

**Benefits**:
- ⚡ **10-50ms page loads** (vs 500-1500ms with direct Notion API)
- 🚀 **No caching complexity** - D1 is fast enough without cache
- 💪 **Reliable** - Works even if Notion API is down
- 🔍 **Full-text search** powered by SQLite FTS5
- 📊 **Related articles** based on shared topics

### Sync Worker

The sync worker automatically syncs Notion → D1 every 10 minutes via Cloudflare Cron Triggers.

**Manual sync trigger**:
```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/sync
```

**Monitor sync status**:
```bash
wrangler tail  # View real-time logs
```

Only articles with status "Published" will appear on the site. Draft and Ready articles are excluded.

## Project Structure

```
/
├── migrations/
│   └── 0001_create_articles_table.sql  # D1 database schema
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
│   │   ├── db-fetch.ts        # D1 database queries (NEW)
│   │   ├── notion-fetch.ts     # Legacy Notion API (deprecated)
│   │   ├── cache.ts           # Cache utilities (deprecated)
│   │   └── utils.ts
│   ├── pages/
│   │   ├── article/
│   │   │   └── [slug].astro   # Article detail + related articles
│   │   ├── about.astro
│   │   ├── index.astro        # Homepage with topic sections
│   │   └── search.astro       # Full-text search (NEW)
│   ├── workers/
│   │   └── sync.ts            # Notion → D1 sync worker (NEW)
│   ├── styles/
│   │   └── global.css
├── astro.config.mjs
├── wrangler.toml               # Cloudflare configuration (NEW)
├── D1_SETUP.md                 # D1 setup guide (NEW)
├── package.json
└── README.md
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
