import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // Check environment variables
    const processEnvKey = typeof process !== 'undefined' ? process.env?.NOTION_API_KEY : undefined;
    const importMetaKey = import.meta.env.NOTION_API_KEY;
    const apiKey = processEnvKey || importMetaKey;

    const processEnvDbId = typeof process !== 'undefined' ? process.env?.NOTION_DATABASE_ID : undefined;
    const importMetaDbId = import.meta.env.NOTION_DATABASE_ID;
    const databaseId = processEnvDbId || importMetaDbId || "2e12d00c-e384-80a9-a895-f2efbe619de9";

    const hasApiKey = !!apiKey;

    // Try to make a direct fetch call to Notion API
    let notionResponse = null;
    let notionError = null;

    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            property: "Status",
            status: {
              equals: "Published",
            },
          },
          page_size: 3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        notionResponse = {
          success: true,
          articleCount: data.results?.length || 0,
          hasResults: data.results?.length > 0,
        };
      } else {
        notionError = {
          status: response.status,
          statusText: response.statusText,
          body: await response.text(),
        };
      }
    } catch (error) {
      notionError = error instanceof Error ? error.message : 'Unknown error';
    }

    return new Response(
      JSON.stringify({
        environment: {
          hasApiKey,
          apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET',
          apiKeySource: processEnvKey ? 'process.env' : importMetaKey ? 'import.meta.env' : 'none',
          databaseId,
          databaseIdSource: processEnvDbId ? 'process.env' : importMetaDbId ? 'import.meta.env' : 'hardcoded',
        },
        notionApiTest: {
          response: notionResponse,
          error: notionError,
        },
        runtime: {
          platform: typeof process !== 'undefined' ? 'node' : 'edge',
          hasCaches: typeof caches !== 'undefined',
          hasProcessEnv: typeof process !== 'undefined' && !!process.env,
        },
      }, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
