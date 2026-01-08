import type { APIRoute } from 'astro';
import { invalidateCache } from '../../lib/cache';

/**
 * Cron job endpoint for cache refresh
 * This is called by Cloudflare Workers Cron Trigger every 40 minutes
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    // Verify this is coming from Cloudflare Cron
    const cronHeader = request.headers.get('cf-cron');

    // Log the cron execution
    console.log('Cron job triggered at:', new Date().toISOString());
    if (cronHeader) {
      console.log('Cron header:', cronHeader);
    }

    // Invalidate all cache to force fresh data fetch on next request
    await invalidateCache();

    console.log('Cache invalidated by cron job');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cache invalidated successfully',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in cron job:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
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
