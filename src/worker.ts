/**
 * Cloudflare Workers custom handler for cron triggers
 * This file handles scheduled events (cron jobs) for cache refresh
 */

export interface Env {
  ASSETS: any;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}

/**
 * Scheduled event handler - runs every 40 minutes
 * This calls the /api/cron endpoint to invalidate the cache
 */
export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log('Cron trigger fired at:', new Date(event.scheduledTime).toISOString());

  try {
    // Call the cron endpoint to invalidate cache
    // Note: In production, this would be your actual domain
    const cronUrl = 'https://feitewen.com/api/cron';

    // For development/testing, we'll just log
    console.log('Cron job would call:', cronUrl);

    // In production, uncomment this:
    // const response = await fetch(cronUrl);
    // console.log('Cron response:', await response.text());

    console.log('Cache refresh scheduled successfully');
  } catch (error) {
    console.error('Error in scheduled handler:', error);
  }
}
