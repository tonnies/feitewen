# D1 Database Setup Guide

This guide walks you through setting up Cloudflare D1 database for faster, more reliable page loading.

## 🎯 What This Does

Replaces direct Notion API calls with a fast D1 database:
- **Before**: User → Cloudflare Workers → Notion API (500-1500ms)
- **After**: User → Cloudflare Workers → D1 Database (10-50ms)

Background sync worker syncs Notion → D1 every 10 minutes.

## 📋 Prerequisites

- Cloudflare account (free tier works)
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)

## 🚀 Setup Steps

### 1. Create Test D1 Database

```bash
# Create the test database
wrangler d1 create feitewen-test

# You'll see output like:
# ✅ Successfully created DB 'feitewen-test' in region WEUR
# Created your database using D1's new storage backend.
#
# [[d1_databases]]
# binding = "DB"
# database_name = "feitewen-test"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. Update wrangler.toml

Copy the `database_id` from the output above and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "feitewen-test"
database_id = "YOUR-DATABASE-ID-HERE"  # Replace with actual ID
```

### 3. Run Database Migrations

```bash
# Apply the schema to create tables and indexes
wrangler d1 execute feitewen-test --file=./migrations/0001_create_articles_table.sql --remote
```

Expected output:
```
🌀 Executing on remote database feitewen-test (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx):
🌀 To execute on your local development database, remove the --remote flag from your wrangler command.
🚣 Executed 10 commands in 0.234ms
```

### 4. Set Environment Secrets

```bash
# Set Notion API key
wrangler secret put NOTION_API_KEY
# Paste your Notion API key when prompted

# Set Notion Database ID
wrangler secret put NOTION_DATABASE_ID
# Paste your Notion database ID when prompted
```

### 5. Deploy Sync Worker

```bash
# Deploy the sync worker
wrangler deploy src/workers/sync.ts

# You'll see output like:
# Total Upload: XX.XX KiB / gzip: XX.XX KiB
# Uploaded feitewen (X.XX sec)
# Published feitewen (X.XX sec)
#   https://feitewen.YOUR-SUBDOMAIN.workers.dev
```

### 6. Perform Initial Sync

Trigger the first sync manually to populate the database:

```bash
# Replace with your worker URL
curl -X POST https://feitewen.YOUR-SUBDOMAIN.workers.dev/sync

# You should see:
# {
#   "success": true,
#   "duration": "XXXXms",
#   "stats": {
#     "inserted": X,
#     "updated": 0,
#     "deleted": 0
#   },
#   "timestamp": "2026-01-09T..."
# }
```

### 7. Verify Data

```bash
# Query the database to verify articles were synced
wrangler d1 execute feitewen-test --command "SELECT COUNT(*) as total FROM articles" --remote

# Expected output:
# ┌───────┐
# │ total │
# ├───────┤
# │ X     │
# └───────┘

# View sample articles
wrangler d1 execute feitewen-test --command "SELECT title, slug, publish_date FROM articles LIMIT 5" --remote
```

### 8. Update Astro Dev Environment

For local development with D1:

```bash
# Install wrangler as dev dependency if not already installed
npm install -D wrangler

# Run Astro with D1 bindings
npm run dev -- --config-file wrangler.toml
```

Alternatively, use Cloudflare's local dev mode:

```bash
# This will run Astro with D1 bindings automatically
npx wrangler pages dev -- npm run dev
```

### 9. Build and Deploy to Cloudflare Pages

```bash
# Build the Astro site
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

## 🔄 Sync Worker Configuration

The sync worker automatically runs every 10 minutes via Cloudflare Cron Triggers.

### Manual Sync Trigger

To trigger a sync manually at any time:

```bash
curl -X POST https://feitewen.YOUR-SUBDOMAIN.workers.dev/sync
```

### Change Sync Frequency

Edit `wrangler.toml`:

```toml
# Every 10 minutes (current)
crons = ["*/10 * * * *"]

# Every 5 minutes
crons = ["*/5 * * * *"]

# Every hour
crons = ["0 * * * *"]
```

Redeploy after changes:
```bash
wrangler deploy src/workers/sync.ts
```

## 🧪 Testing

### Test Search Functionality

```bash
# Test full-text search
wrangler d1 execute feitewen-test --command "SELECT title FROM articles_fts WHERE articles_fts MATCH 'economics' LIMIT 5" --remote
```

### Test Related Articles Query

```bash
# Find articles with "Politics" topic
wrangler d1 execute feitewen-test --command "SELECT title, topics FROM articles WHERE topics LIKE '%Politics%' LIMIT 5" --remote
```

### Check Sync Status

```bash
# View last sync time for all articles
wrangler d1 execute feitewen-test --command "SELECT id, title, datetime(synced_at/1000, 'unixepoch') as last_synced FROM articles ORDER BY synced_at DESC LIMIT 5" --remote
```

## 🚨 Troubleshooting

### Issue: "D1 binding not found"

**Solution**: Make sure you're running Astro with wrangler:
```bash
npx wrangler pages dev -- npm run dev
```

### Issue: Sync worker returns 500 error

**Solution**: Check secrets are set correctly:
```bash
wrangler secret list
```

Should show:
- NOTION_API_KEY
- NOTION_DATABASE_ID

### Issue: No articles in database after sync

**Solution**:
1. Check Notion API credentials are correct
2. Verify Notion database ID is correct
3. Check that articles have Status = "Published" in Notion
4. View sync worker logs:
   ```bash
   wrangler tail
   ```

### Issue: Search not working

**Solution**: Verify FTS table was created:
```bash
wrangler d1 execute feitewen-test --command "SELECT name FROM sqlite_master WHERE type='table'" --remote
```

Should show both `articles` and `articles_fts` tables.

## 📊 Performance Comparison

### Before (Notion API Direct)
- First load: 800-1500ms
- Cached load: 50-100ms (2 min cache)
- Rate limits: 3 requests/second
- Reliability: Depends on Notion API uptime

### After (D1 Database)
- All loads: 10-50ms
- No caching needed (D1 is fast enough)
- No rate limits
- Reliability: Works even if Notion is down

## 🎉 Production Deployment

Once testing is successful, create production database:

```bash
# 1. Create production database
wrangler d1 create feitewen-prod

# 2. Update wrangler.toml with production config
# 3. Run migrations on production DB
wrangler d1 execute feitewen-prod --file=./migrations/0001_create_articles_table.sql --remote

# 4. Set production secrets (if different)
wrangler secret put NOTION_API_KEY --env production
wrangler secret put NOTION_DATABASE_ID --env production

# 5. Deploy
wrangler deploy src/workers/sync.ts --env production
npm run build
wrangler pages deploy dist --env production
```

## 🔍 Monitoring

Monitor sync worker performance:

```bash
# View real-time logs
wrangler tail

# View Cloudflare dashboard for:
# - Worker invocations
# - D1 read/write operations
# - Error rates
```

Visit Cloudflare Dashboard → Workers & Pages → D1 to see:
- Total queries
- Database size
- Query performance metrics

## 📚 Additional Features

### Search Functionality
- Visit `/search` on your site
- Full-text search across titles, excerpts, and content
- Powered by SQLite FTS5

### Related Articles
- Automatically shown at bottom of each article
- Based on shared topics
- Configurable in `db-fetch.ts` (currently shows 3)

## 🛠️ Development Commands

```bash
# View D1 database info
wrangler d1 info feitewen-test

# Open D1 database in SQL REPL
wrangler d1 execute feitewen-test --command "SELECT * FROM articles LIMIT 1" --remote --json

# List all tables
wrangler d1 execute feitewen-test --command "SELECT name FROM sqlite_master WHERE type='table'" --remote

# Drop and recreate tables (CAUTION: deletes all data)
wrangler d1 execute feitewen-test --command "DROP TABLE IF EXISTS articles; DROP TABLE IF EXISTS articles_fts;" --remote
wrangler d1 execute feitewen-test --file=./migrations/0001_create_articles_table.sql --remote
```

## ✅ Success Checklist

- [ ] D1 database created
- [ ] Migrations applied successfully
- [ ] Environment secrets set
- [ ] Sync worker deployed
- [ ] Initial sync completed with articles in DB
- [ ] Local development works with D1
- [ ] Search page returns results
- [ ] Related articles show on article pages
- [ ] Production deployment successful

## 🎯 Next Steps

1. Monitor sync worker for a few days
2. Add webhook support when Cloudflare makes it available
3. Consider adding analytics/view counts to D1
4. Implement article recommendations based on reading history

## 📞 Support

If you encounter issues:
1. Check Cloudflare dashboard logs
2. Run `wrangler tail` to see real-time worker logs
3. Verify D1 database has data
4. Check Notion API credentials

---

**Congratulations! Your site now loads 10-30x faster with D1 database! 🚀**
