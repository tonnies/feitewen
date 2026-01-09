/**
 * Cache utility for Cloudflare Workers
 * Uses Cloudflare's Cache API to store Notion data
 */

const CACHE_NAME = 'notion-cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds - good balance between freshness and performance

// In-memory cache fallback for development (when Cache API is not available)
const memoryCache = new Map<string, { data: any; timestamp: number }>();

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Convert cache key to valid URL for Cloudflare Cache API
function getCacheUrl(key: string): string {
  // Use a fake domain - Cloudflare Cache API just needs a valid URL format
  return `https://cache.local/${encodeURIComponent(key)}`;
}

export async function getCachedData<T>(
  key: string
): Promise<T | null> {
  try {
    // Try to get from Cloudflare Cache API if available
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const cacheUrl = getCacheUrl(key);
      const response = await cache.match(cacheUrl);

      if (response) {
        const entry: CacheEntry<T> = await response.json();

        // Check if cache is still valid
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          console.log(`Cache hit for key: ${key}`);
          return entry.data;
        } else {
          // Cache expired, delete it
          await cache.delete(cacheUrl);
          console.log(`Cache expired for key: ${key}`);
        }
      }
    } else {
      // Fallback to in-memory cache for development
      const cached = memoryCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`Memory cache hit for key: ${key}`);
        return cached.data;
      } else if (cached) {
        memoryCache.delete(key);
        console.log(`Memory cache expired for key: ${key}`);
      }
    }

    return null;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

export async function setCachedData<T>(
  key: string,
  data: T
): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const cacheUrl = getCacheUrl(key);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };

      const response = new Response(JSON.stringify(entry), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${CACHE_TTL / 1000}`,
        },
      });

      await cache.put(cacheUrl, response);
      console.log(`Cache updated for key: ${key}`);
    } else {
      // Fallback to in-memory cache for development
      memoryCache.set(key, { data, timestamp: Date.now() });
      console.log(`Memory cache updated for key: ${key}`);
    }
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

export async function invalidateCache(key?: string): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);

      if (key) {
        const cacheUrl = getCacheUrl(key);
        await cache.delete(cacheUrl);
        console.log(`Cache invalidated for key: ${key}`);
      } else {
        // Clear all cache
        const keys = await cache.keys();
        await Promise.all(keys.map(request => cache.delete(request)));
        console.log('All cache cleared');
      }
    } else {
      // Fallback to in-memory cache for development
      if (key) {
        memoryCache.delete(key);
        console.log(`Memory cache invalidated for key: ${key}`);
      } else {
        memoryCache.clear();
        console.log('All memory cache cleared');
      }
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

// Generate cache keys
export const CACHE_KEYS = {
  articles: (topic?: string, cursor?: string) =>
    `articles:${topic || 'all'}:${cursor || 'first'}`,
  article: (slug: string) => `article:${slug}`,
  slugs: () => 'article-slugs',
};
