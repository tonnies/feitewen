# Deployment Guide - Feite Wen

This guide explains how to deploy your Feite Wen news site to Cloudflare Workers with automatic cache refresh.

## Architecture Overview

The site uses a **hybrid SSR + caching** approach:

1. **Server-Side Rendering (SSR)**: Pages are rendered on-demand, not pre-built
2. **Cloudflare Cache API**: Caches Notion data for fast responses
3. **Cron Trigger**: Automatically invalidates cache every 40 minutes
4. **On-demand refresh**: Manual cache clearing via API endpoint

### How It Works

```
Request Flow:
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       v
┌─────────────────────┐
│  Cloudflare Worker  │
│   (Your Astro App)  │
└──────┬──────────────┘
       │
       v
   Check Cache?
       │
       ├─ YES (Cache Hit) ──> Return cached data (FAST!)
       │
       └─ NO (Cache Miss) ───> Fetch from Notion API
                                    │
                                    v
                               Cache result
                                    │
                                    v
                               Return data


Cron Job (Every 40 min):
┌──────────────────┐
│  Cron Trigger    │
└────────┬─────────┘
         │
         v
   ┌──────────────┐
   │ /api/cron    │
   └──────┬───────┘
          │
          v
   Clear all cache
          │
          v
   Next request fetches fresh data
```

## Deployment Options

### Option 1: Cloudflare Pages (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Cloudflare Pages Project**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Pages → Create a project
   - Connect to your GitHub repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

4. **Add Environment Variables**
   - Go to Settings → Environment variables
   - Add `NOTION_API_KEY`: Your Notion integration token
   - Add `NOTION_DATABASE_ID`: `2e12d00c-e384-80a9-a895-f2efbe619de9`

5. **Deploy**
   - Click "Save and Deploy"
   - Your site will be live at `https://your-project.pages.dev`

6. **Verify Cron Trigger**
   - The cron trigger is configured in `wrangler.jsonc`
   - It runs automatically every 40 minutes
   - Check logs in Cloudflare dashboard to verify it's working

### Option 2: Cloudflare Workers CLI (Wrangler)

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Set Secrets**
   ```bash
   wrangler secret put NOTION_API_KEY
   # Paste your Notion API key when prompted
   ```

4. **Build and Deploy**
   ```bash
   npm run build
   wrangler deploy
   ```

5. **Verify Deployment**
   - Your site will be live at `https://fw.<your-subdomain>.workers.dev`
   - Or use a custom domain

## Verifying Everything Works

### 1. Test the Homepage

Visit your site - you should see articles from your Notion database.

### 2. Test Caching

1. First visit: Data fetched from Notion (slower)
2. Refresh page: Served from cache (fast!)
3. Check browser Network tab: See response times

### 3. Test Manual Cache Refresh

```bash
curl -X POST https://your-domain.com/api/webhook
```

Response:
```json
{
  "success": true,
  "message": "Cache cleared successfully. Next request will fetch fresh data from Notion."
}
```

### 4. Test Cron Job

1. **View Cron Logs** (Cloudflare Dashboard)
   - Go to your Worker/Pages project
   - Click "Logs" or "Real-time logs"
   - Wait for the next 40-minute interval
   - You should see: "Cron job triggered at: [timestamp]"

2. **Manual Cron Trigger** (for testing)
   ```bash
   wrangler tail
   # In another terminal:
   curl https://your-domain.com/api/cron
   ```

### 5. Monitor Cache Behavior

Add this to your browser console on any page:
```javascript
// Check cache status
fetch('/api/webhook').then(r => r.json()).then(console.log)
```

## Troubleshooting

### Cache Not Working

**Symptoms**: Every request is slow, cache never hits

**Solutions**:
1. Check if Cloudflare Cache API is available in your environment
2. Look for errors in Cloudflare logs
3. Verify `typeof caches !== 'undefined'` in browser console

### Cron Job Not Running

**Symptoms**: Cache never refreshes automatically

**Solutions**:
1. Check `wrangler.jsonc` has the triggers configured
2. Verify in Cloudflare dashboard: Workers → Your worker → Triggers → Cron Triggers
3. Look for cron execution in logs
4. Ensure you're using a paid Cloudflare plan (cron requires paid plan)

### Articles Not Showing

**Symptoms**: No articles on homepage

**Solutions**:
1. Verify Notion API key is set correctly
2. Check articles have Status = "Published" in Notion
3. Verify database ID matches your Notion database
4. Check Cloudflare logs for API errors

### Stale Data After Publishing

**Symptoms**: New articles don't appear immediately

**Expected Behavior**: This is normal! Articles appear within 40 minutes.

**Solutions**:
- Manually clear cache: `curl -X POST https://your-domain.com/api/webhook`
- Or wait for next cron run (max 40 minutes)

## Cache Configuration

### Adjusting Cache TTL

Edit `src/lib/cache.ts`:
```typescript
const CACHE_TTL = 40 * 60 * 1000; // Change to desired milliseconds
```

### Adjusting Cron Schedule

Edit `wrangler.jsonc`:
```jsonc
"triggers": {
  "crons": [
    "*/40 * * * *"  // Change to desired cron expression
  ]
}
```

Cron expression examples:
- `*/30 * * * *` - Every 30 minutes
- `0 * * * *` - Every hour
- `0 */2 * * *` - Every 2 hours
- `0 0 * * *` - Daily at midnight

## Performance Optimization

### Expected Performance

- **Cache Hit**: ~50-100ms response time
- **Cache Miss**: ~500-1500ms (Notion API call)
- **Cache Hit Rate**: Should be >95% after initial page load

### Improving Performance

1. **Pre-warm Cache**: After deployment, visit all pages
   ```bash
   curl https://your-domain.com/
   curl https://your-domain.com/?topic=Politics
   # etc.
   ```

2. **Monitor Cache Metrics**: Check Cloudflare Analytics
   - Cache hit ratio
   - Response times
   - Error rates

## Custom Domain Setup

1. **Add Custom Domain** (Cloudflare Pages)
   - Go to Pages → Your project → Custom domains
   - Add your domain (e.g., `feitewen.com`)
   - Follow DNS setup instructions

2. **Update Worker** (if using Wrangler)
   ```bash
   wrangler publish --routes="feitewen.com/*"
   ```

3. **Update CORS** (if needed)
   - Cloudflare automatically handles this for Pages
   - For Workers, you may need to add CORS headers

## Monitoring

### Key Metrics to Watch

1. **Cache Hit Rate**: Should be >90%
2. **Response Times**: <200ms for cache hits
3. **Notion API Calls**: Should be minimal (mostly on cache refresh)
4. **Error Rate**: Should be near 0%

### Setting Up Alerts

1. Go to Cloudflare Dashboard
2. Your Worker/Pages → Alerts
3. Set up alerts for:
   - High error rate
   - Slow response times
   - Failed cron executions

## Production Checklist

- [ ] Environment variables set in Cloudflare
- [ ] Custom domain configured
- [ ] Cron trigger verified in logs
- [ ] Cache working (test hit/miss)
- [ ] All articles showing correctly
- [ ] About page content updated
- [ ] Analytics/monitoring set up
- [ ] DNS configured for custom domain
- [ ] SSL certificate active

## Support

For issues:
1. Check Cloudflare logs first
2. Review this deployment guide
3. Test with `wrangler tail` for real-time logs
4. Verify Notion API access

## Next Steps

After deployment:
1. Update About page content in `src/pages/about.astro`
2. Add search functionality (currently UI only)
3. Set up analytics
4. Add RSS feed
5. Customize design/branding
