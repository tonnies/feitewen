/**
 * Cache utility for Cloudflare Workers
 * Uses Cloudflare's Cache API to store Notion data
 */

const CACHE_NAME = 'notion-cache';
const CACHE_TTL = 40 * 60 * 1000; // 40 minutes in milliseconds

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function getCachedData<T>(
  key: string
): Promise<T | null> {
  try {
    // Try to get from Cloudflare Cache API if available
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(key);

      if (response) {
        const entry: CacheEntry<T> = await response.json();

        // Check if cache is still valid
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          console.log(`Cache hit for key: ${key}`);
          return entry.data;
        } else {
          // Cache expired, delete it
          await cache.delete(key);
          console.log(`Cache expired for key: ${key}`);
        }
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

      await cache.put(key, response);
      console.log(`Cache updated for key: ${key}`);
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
        await cache.delete(key);
        console.log(`Cache invalidated for key: ${key}`);
      } else {
        // Clear all cache
        const keys = await cache.keys();
        await Promise.all(keys.map(request => cache.delete(request)));
        console.log('All cache cleared');
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
