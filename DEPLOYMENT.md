# Quick Deployment Guide

## First-Time Setup (Test Environment)

Follow these steps in order:

### Step 1: Create D1 Database
```bash
wrangler d1 create feitewen-test
```
📝 **Copy the `database_id` from the output**

### Step 2: Update Config Files
Edit both files and replace `test-db-id` with your actual database_id:
- `wrangler.toml` (line 5)
- `wrangler-sync.toml` (line 9)

### Step 3: Run Migrations
```bash
wrangler d1 execute feitewen-test --file=./migrations/0001_create_articles_table.sql --remote
```

### Step 4: Set Secrets for Sync Worker
```bash
wrangler secret put NOTION_API_KEY
# Paste your Notion API key when prompted

wrangler secret put NOTION_DATABASE_ID
# Paste your Notion database ID when prompted
```

### Step 5: Deploy Sync Worker
```bash
wrangler deploy src/workers/sync.ts --config wrangler-sync.toml
```
📝 **Copy the worker URL from the output**

### Step 6: Trigger Initial Sync
```bash
# Replace with your actual sync worker URL
curl -X POST https://YOUR-WORKER.workers.dev/sync
```

✅ You should see a success response with article counts

### Step 7: Verify Data in D1
```bash
wrangler d1 execute feitewen-test --command "SELECT COUNT(*) as total FROM articles" --remote
```

✅ Should show number of articles synced

### Step 8: Deploy Astro Site

**Option A: Cloudflare Dashboard (Recommended)**
1. Go to https://dash.cloudflare.com → Pages
2. Click "Create a project"
3. Connect your GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Build output: `dist`
5. Deploy
6. After deployment: Settings → Functions → D1 database bindings
7. Add binding: `DB` → `feitewen-test`
8. Redeploy

**Option B: CLI**
```bash
npm run build
wrangler pages deploy dist --project-name feitewen
```
Then configure D1 binding in dashboard as described above.

---

## Testing Locally

```bash
# Install dependencies
npm install

# Run with D1 bindings
npx wrangler pages dev -- npm run dev
```

Visit http://localhost:8788

---

## Production Deployment

Once you've tested everything:

### 1. Create Production Database
```bash
wrangler d1 create feitewen-prod
```
Update both config files with the production database_id

### 2. Run Migrations
```bash
wrangler d1 execute feitewen-prod --file=./migrations/0001_create_articles_table.sql --remote
```

### 3. Deploy Sync Worker
```bash
wrangler deploy src/workers/sync.ts --config wrangler-sync.toml
```

### 4. Initial Sync
```bash
curl -X POST https://YOUR-PROD-WORKER.workers.dev/sync
```

### 5. Deploy Site
In Cloudflare Pages dashboard:
- Create production environment (if not exists)
- Configure D1 binding: `DB` → `feitewen-prod`
- Deploy from main branch

---

## Ongoing Maintenance

### Manual Sync
```bash
curl -X POST https://YOUR-WORKER.workers.dev/sync
```

### Check Sync Status
```bash
wrangler tail  # View real-time worker logs
```

### Query Database
```bash
# Check article count
wrangler d1 execute feitewen-test --command "SELECT COUNT(*) FROM articles" --remote

# View recent articles
wrangler d1 execute feitewen-test --command "SELECT title, publish_date FROM articles ORDER BY publish_date DESC LIMIT 5" --remote
```

### Update Sync Frequency
Edit `wrangler-sync.toml` cron schedule, then:
```bash
wrangler deploy src/workers/sync.ts --config wrangler-sync.toml
```

---

## Troubleshooting

### "D1 binding not found" error
- Make sure D1 binding is configured in Cloudflare Pages dashboard
- Variable name must be exactly `DB`
- Database must be selected

### Sync worker returns 500
- Check secrets are set: `wrangler secret list`
- Check Notion API credentials
- View logs: `wrangler tail`

### No articles showing
- Check sync completed: Query D1 to see if articles exist
- Check article Status in Notion is "Published"
- Check D1 binding is configured correctly

### Search not working
- Verify FTS table exists: `wrangler d1 execute feitewen-test --command "SELECT name FROM sqlite_master WHERE type='table'" --remote`
- Should see both `articles` and `articles_fts`

---

## Architecture Diagram

```
┌─────────────┐
│   Notion    │
│     CMS     │
└──────┬──────┘
       │
       │ (every 10 min)
       ▼
┌─────────────────┐
│  Sync Worker    │
│ (Cloudflare     │
│   Worker)       │
└────────┬────────┘
         │
         ▼
   ┌──────────┐
   │ D1 Database │
   │  (SQLite)   │
   └──────┬──────┘
          │
          │ (reads)
          ▼
   ┌─────────────┐
   │ Astro Site  │
   │ (Cloudflare │
   │   Pages)    │
   └──────┬──────┘
          │
          ▼
      ┌────────┐
      │  User  │
      └────────┘
```

---

## Quick Commands Reference

```bash
# Create database
wrangler d1 create feitewen-test

# Run migrations
wrangler d1 execute DB_NAME --file=./migrations/0001_create_articles_table.sql --remote

# Query database
wrangler d1 execute DB_NAME --command "SQL QUERY HERE" --remote

# Set secrets
wrangler secret put SECRET_NAME

# Deploy sync worker
wrangler deploy src/workers/sync.ts --config wrangler-sync.toml

# Deploy Astro site
npm run build && wrangler pages deploy dist --project-name feitewen

# Local development
npx wrangler pages dev -- npm run dev

# View logs
wrangler tail
```

---

For detailed information, see [D1_SETUP.md](./D1_SETUP.md)
