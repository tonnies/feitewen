import type { APIRoute } from 'astro';
import { invalidateCache } from '../../lib/cache';

/**
 * Manual cache refresh endpoint
 * This can be called manually to force a cache refresh
 */
export const POST: APIRoute = async () => {
  try {
    console.log('Manual cache refresh triggered');

    // Invalidate all cache
    await invalidateCache();

    console.log('Cache cleared successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cache cleared successfully. Next request will fetch fresh data from Notion.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error clearing cache:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

/**
 * Health check endpoint
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Cache refresh endpoint is active',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
