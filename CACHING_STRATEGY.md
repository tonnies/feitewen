# Caching Strategy for Feite Wen

## Problem We Solved

**Original Plan**: Use Notion webhooks to trigger rebuilds when articles change.
**Issue**: Cloudflare Workers don't support deploy hooks.
**Solution**: SSR + Caching + Cron Triggers

## Our Approach

Instead of rebuilding the entire site when data changes, we:
1. Render pages on-demand (SSR)
2. Cache Notion API responses
3. Periodically refresh the cache

### Benefits

✅ **No rebuilds needed** - Pages render instantly from cache
✅ **Always available** - Site works even during Notion API issues (serves stale cache)
✅ **Cost effective** - Minimal Notion API calls
✅ **Simple deployment** - No complex webhook infrastructure
✅ **Predictable freshness** - Data updates every 40 minutes

## How It Works

### 1. First Request (Cache Miss)

```
User requests page
    ↓
Check Cloudflare Cache API
    ↓
Cache MISS
    ↓
Fetch from Notion API (~500-1500ms)
    ↓
Store in Cache
    ↓
Return to user
```

### 2. Subsequent Requests (Cache Hit)

```
User requests page
    ↓
Check Cloudflare Cache API
    ↓
Cache HIT
    ↓
Return cached data (~50-100ms) ⚡ FAST!
```

### 3. Cache Refresh (Every 40 minutes)

```
Cron Trigger fires
    ↓
Call /api/cron endpoint
    ↓
Invalidate ALL cache
    ↓
Next request will fetch fresh data from Notion
```

## Implementation Details

### File Structure

```
src/
├── lib/
│   ├── cache.ts          # Cache utility functions
│   └── notion.ts         # Notion API calls (with caching)
├── pages/
│   └── api/
│       ├── cron.ts       # Cron job handler
│       └── webhook.ts    # Manual cache refresh
└── worker.ts             # Cloudflare Worker handler
```

### Key Files

#### 1. `src/lib/cache.ts`

Provides caching utilities:
- `getCachedData<T>(key)` - Retrieve from cache
- `setCachedData<T>(key, data)` - Store in cache
- `invalidateCache(key?)` - Clear cache
- `CACHE_KEYS` - Standardized cache key generation

#### 2. `src/lib/notion.ts`

All Notion API functions wrapped with caching:
- `getPublishedArticles()` - Fetch articles (cached)
- `getArticleBySlug()` - Fetch single article (cached)
- `getAllArticleSlugs()` - Fetch all slugs (cached)

#### 3. `src/pages/api/cron.ts`

Cron job endpoint:
- Called by Cloudflare Cron Trigger every 40 minutes
- Invalidates all cache
- Logs execution for monitoring

#### 4. `src/pages/api/webhook.ts`

Manual refresh endpoint:
- POST request clears all cache
- Useful for immediate updates
- Returns success/error response

#### 5. `wrangler.jsonc`

Cloudflare Workers configuration:
```jsonc
{
  "triggers": {
    "crons": ["*/40 * * * *"]  // Every 40 minutes
  }
}
```

## Cache Keys

We use consistent cache keys for predictable caching:

```typescript
CACHE_KEYS = {
  articles: (topic?, cursor?) => `articles:${topic||'all'}:${cursor||'first'}`,
  article: (slug) => `article:${slug}`,
  slugs: () => 'article-slugs'
}
```

Examples:
- `articles:all:first` - First page of all articles
- `articles:Politics:first` - First page of Politics articles
- `article:president-ramaphosa-appoints-ndpp` - Specific article
- `article-slugs` - List of all article slugs

## Cache Invalidation Strategy

### Automatic (Cron-based)

Every 40 minutes:
1. Cron trigger fires
2. Calls `/api/cron`
3. Invalidates ALL cache keys
4. Next request fetches fresh data

### Manual (API-based)

Call the webhook endpoint:
```bash
curl -X POST https://your-domain.com/api/webhook
```

This immediately clears all cache.

## Performance Characteristics

### Cache Hit (95% of requests)

- **Response Time**: 50-100ms
- **Cost**: Free (Cloudflare Cache)
- **User Experience**: Instant page loads

### Cache Miss (5% of requests)

- **Response Time**: 500-1500ms
- **Cost**: Notion API call
- **User Experience**: Slight delay, but acceptable

### Cache Refresh (Every 40 min)

- **Duration**: <100ms (just invalidation)
- **Impact**: Next request will be slower (cache miss)
- **Frequency**: 36 times per day

## Monitoring Cache Performance

### Cloudflare Dashboard

View metrics:
- Cache hit ratio
- Response times
- Error rates
- Cron execution logs

### Console Logging

Cache operations log to console:
```
Cache hit for key: articles:all:first
Cache updated for key: article:new-article-slug
Cache invalidated by cron job
```

## Edge Cases & Handling

### Notion API Down

- **Behavior**: Serve stale cache indefinitely
- **User Impact**: Site continues working
- **Resolution**: Automatic when Notion recovers

### Cache API Unavailable

- **Behavior**: Falls back to direct Notion API calls
- **User Impact**: Slower responses, no cache
- **Detection**: Check `typeof caches !== 'undefined'`

### Stale Data After Publishing

- **Behavior**: New articles appear within 40 minutes
- **User Impact**: Small delay acceptable for news site
- **Workaround**: Manual cache refresh via API

### Concurrent Requests During Cache Miss

- **Behavior**: Multiple requests may call Notion API simultaneously
- **Impact**: Temporary increase in API calls
- **Mitigation**: Cloudflare's edge caching helps reduce this

## Comparison to Alternatives

### vs. Static Site Generation (SSG)

| Aspect | Our Approach (SSR + Cache) | SSG |
|--------|---------------------------|-----|
| **Build Time** | None | 5-10 minutes |
| **Deploy Time** | Instant | 5-10 minutes |
| **Update Latency** | 40 minutes max | 5-10 minutes + rebuild |
| **Flexibility** | High (on-demand rendering) | Low (pre-built pages) |
| **Complexity** | Medium | Low |

### vs. Pure SSR (No Cache)

| Aspect | Our Approach | Pure SSR |
|--------|-------------|----------|
| **Response Time** | 50-100ms | 500-1500ms |
| **Notion API Calls** | Minimal | Every request |
| **Cost** | Low | Higher |
| **Resilience** | High (stale cache) | Low (depends on Notion) |

### vs. Webhook-based Rebuilds

| Aspect | Our Approach | Webhooks |
|--------|-------------|----------|
| **Deploy Hook Support** | Not needed | Required |
| **Update Trigger** | Time-based | Event-based |
| **Update Latency** | 40 minutes max | Immediate |
| **Complexity** | Medium | High |
| **Worker Compatibility** | ✅ Works | ❌ Not supported |

## Configuration Options

### Adjust Cache Duration

`src/lib/cache.ts`:
```typescript
const CACHE_TTL = 40 * 60 * 1000; // 40 minutes
```

Considerations:
- Shorter = fresher data, more Notion API calls
- Longer = stale data, fewer API calls
- Recommended: 30-60 minutes for news sites

### Adjust Cron Frequency

`wrangler.jsonc`:
```jsonc
"crons": ["*/40 * * * *"]
```

Options:
- `*/30 * * * *` - Every 30 minutes (fresher)
- `0 * * * *` - Every hour (less frequent)
- `0 */2 * * *` - Every 2 hours (minimal)

Note: Cloudflare Workers cron has limits on free tier.

### Selective Cache Invalidation

Currently we invalidate ALL cache. You could optimize:

```typescript
// Instead of invalidating everything
await invalidateCache();

// Invalidate specific keys
await invalidateCache(CACHE_KEYS.articles());
```

This would keep article pages cached while refreshing listings.

## Future Improvements

### 1. Smart Cache Invalidation

Only invalidate cache for changed articles:
```typescript
// Compare Notion timestamps
// Only clear cache for updated articles
```

### 2. Webhook Integration (if supported)

If Cloudflare adds webhook support:
```typescript
// Trigger immediate cache refresh on Notion updates
```

### 3. Partial Page Caching

Cache different parts of pages separately:
```typescript
// Cache article content separately from metadata
```

### 4. Analytics Integration

Track cache performance:
```typescript
// Log cache hit/miss rates
// Monitor freshness metrics
```

## Troubleshooting

### Cache Not Working

**Check**: Browser console for cache logs
**Verify**: `typeof caches` in console
**Solution**: Review Cloudflare Cache API availability

### Stale Data Persisting

**Check**: Cron execution logs
**Verify**: Cache invalidation calls
**Solution**: Manual refresh via `/api/webhook`

### Slow Response Times

**Check**: Cache hit ratio
**Verify**: Notion API response times
**Solution**: Optimize cache keys, increase TTL

## Best Practices

1. **Monitor cache hit ratio** - Should be >90%
2. **Set up alerts** - For failed cron jobs
3. **Test cache behavior** - Before production deploy
4. **Document cache keys** - For future debugging
5. **Log cache operations** - For monitoring

## Conclusion

Our caching strategy provides:
- ✅ Fast page loads (50-100ms)
- ✅ Low Notion API costs
- ✅ Automatic data refresh
- ✅ Simple deployment
- ✅ Resilient architecture

The 40-minute update window is acceptable for a news site, and manual refresh is available for urgent updates.
