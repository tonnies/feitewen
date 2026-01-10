/**
 * Notion → D1 Sync Worker
 * This worker syncs published articles from Notion to Cloudflare D1 database
 * Runs on cron schedule (every 10 minutes) or can be triggered manually
 */

interface Env {
  DB: D1Database;
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}

interface NotionArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishDate: string;
  author: string[];
  topics: string[];
  whyItMatters: string;
  status: string;
  coverImage?: string;
  content: any;
}

// Direct fetch to Notion API
async function notionFetch(endpoint: string, apiKey: string, body?: any) {
  const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Fetch all blocks for a page (with pagination)
async function fetchAllBlocks(pageId: string, apiKey: string): Promise<any[]> {
  let allBlocks: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await notionFetch(
      `/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ''}`,
      apiKey
    );

    allBlocks = allBlocks.concat(response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;

    // Safety limit
    if (allBlocks.length > 1000) {
      console.warn(`Article ${pageId} has over 1000 blocks, stopping pagination`);
      break;
    }
  }

  return allBlocks;
}

// Extract article data from Notion page
function extractArticleData(page: any): Omit<NotionArticle, 'content'> {
  const properties = page.properties;

  // Extract title
  let title = "";
  if (properties.Title?.type === "title") {
    title = properties.Title.title.map((t: any) => t.plain_text).join("");
  }

  // Extract slug
  let slug = "";
  if (properties.Slug?.type === "rich_text") {
    slug = properties.Slug.rich_text.map((t: any) => t.plain_text).join("");
  }

  // Extract excerpt
  let excerpt = "";
  if (properties.Excerpt?.type === "rich_text") {
    excerpt = properties.Excerpt.rich_text.map((t: any) => t.plain_text).join("");
  }

  // Extract publish date
  let publishDate = "";
  if (properties["Publish Date"]?.type === "date" && properties["Publish Date"].date) {
    publishDate = properties["Publish Date"].date.start;
  }

  // Extract author
  let author: string[] = [];
  if (properties.Author?.type === "people") {
    author = properties.Author.people.map((p: any) => p.name || "Unknown");
  }

  // Extract topics
  let topics: string[] = [];
  if (properties.Topic?.type === "multi_select") {
    topics = properties.Topic.multi_select.map((t: any) => t.name);
  }

  // Extract why it matters
  let whyItMatters = "";
  if (properties["Why It Matters"]?.type === "rich_text") {
    whyItMatters = properties["Why It Matters"].rich_text
      .map((t: any) => t.plain_text)
      .join("");
  }

  // Extract status
  let status = "";
  if (properties.Status?.type === "status" && properties.Status.status) {
    status = properties.Status.status.name;
  }

  // Extract cover image
  let coverImage: string | undefined = undefined;
  if (properties["Cover Image"]?.type === "files" && properties["Cover Image"].files?.length > 0) {
    const file = properties["Cover Image"].files[0];
    if (file.type === "external") {
      coverImage = file.external?.url;
    } else if (file.type === "file") {
      coverImage = file.file?.url;
    }
  }

  // Fallback to page cover
  if (!coverImage && page.cover) {
    if (page.cover.type === "external") {
      coverImage = page.cover.external?.url;
    } else if (page.cover.type === "file") {
      coverImage = page.cover.file?.url;
    }
  }

  return {
    id: page.id,
    title,
    slug,
    excerpt,
    publishDate,
    author,
    topics,
    whyItMatters,
    status,
    coverImage,
  };
}

// Fetch all published articles from Notion
async function fetchPublishedArticlesFromNotion(env: Env): Promise<NotionArticle[]> {
  const articles: NotionArticle[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await notionFetch(
      `/databases/${env.NOTION_DATABASE_ID}/query`,
      env.NOTION_API_KEY,
      {
        filter: {
          property: "Status",
          status: {
            equals: "Published",
          },
        },
        sorts: [
          {
            property: "Publish Date",
            direction: "descending",
          },
        ],
        page_size: 100,
        start_cursor: startCursor || undefined,
      }
    );

    // Process each page - fetch article metadata first
    const articlesMetadata = response.results.map(page => ({
      data: extractArticleData(page),
      pageId: page.id,
    }));

    // Fetch blocks in parallel (batched to avoid overwhelming Notion API)
    const BATCH_SIZE = 5; // Fetch 5 articles' content at a time
    for (let i = 0; i < articlesMetadata.length; i += BATCH_SIZE) {
      const batch = articlesMetadata.slice(i, i + BATCH_SIZE);

      // Fetch all blocks for this batch in parallel
      const contents = await Promise.all(
        batch.map(item => fetchAllBlocks(item.pageId, env.NOTION_API_KEY))
      );

      // Add completed articles to the array
      batch.forEach((item, idx) => {
        articles.push({
          ...item.data,
          content: contents[idx],
        });
      });
    }

    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return articles;
}

// Sync articles to D1
async function syncArticlesToD1(articles: NotionArticle[], db: D1Database): Promise<{
  inserted: number;
  updated: number;
  deleted: number;
}> {
  const now = Date.now();
  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  // Get all existing article IDs from D1
  const existingArticles = await db.prepare('SELECT id, updated_at FROM articles').all();
  const existingIds = new Set(existingArticles.results.map((row: any) => row.id));
  const notionIds = new Set(articles.map(a => a.id));

  // Insert or update articles
  for (const article of articles) {
    const exists = existingIds.has(article.id);

    if (exists) {
      // Update existing article
      await db.prepare(`
        UPDATE articles
        SET title = ?,
            slug = ?,
            excerpt = ?,
            content = ?,
            publish_date = ?,
            author = ?,
            topics = ?,
            why_it_matters = ?,
            status = ?,
            cover_image = ?,
            updated_at = ?,
            synced_at = ?
        WHERE id = ?
      `).bind(
        article.title,
        article.slug,
        article.excerpt,
        JSON.stringify(article.content),
        article.publishDate,
        JSON.stringify(article.author),
        JSON.stringify(article.topics),
        article.whyItMatters,
        article.status,
        article.coverImage || null,
        now,
        now,
        article.id
      ).run();
      updated++;
    } else {
      // Insert new article
      await db.prepare(`
        INSERT INTO articles (
          id, title, slug, excerpt, content, publish_date, author, topics,
          why_it_matters, status, cover_image, created_at, updated_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        article.id,
        article.title,
        article.slug,
        article.excerpt,
        JSON.stringify(article.content),
        article.publishDate,
        JSON.stringify(article.author),
        JSON.stringify(article.topics),
        article.whyItMatters,
        article.status,
        article.coverImage || null,
        now,
        now,
        now
      ).run();
      inserted++;
    }
  }

  // Delete articles that are no longer in Notion
  for (const row of existingArticles.results) {
    const id = (row as any).id;
    if (!notionIds.has(id)) {
      await db.prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
      deleted++;
    }
  }

  return { inserted, updated, deleted };
}

// Main sync function
async function performSync(env: Env): Promise<Response> {
  const startTime = Date.now();

  try {
    console.log('Starting Notion → D1 sync...');

    // Fetch all published articles from Notion
    const articles = await fetchPublishedArticlesFromNotion(env);
    console.log(`Fetched ${articles.length} articles from Notion`);

    // Sync to D1
    const stats = await syncArticlesToD1(articles, env.DB);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      duration: `${duration}ms`,
      stats,
      timestamp: new Date().toISOString(),
    };

    console.log('Sync completed:', result);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);

    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResult, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Manual sync trigger endpoint
    if (url.pathname === '/sync' && request.method === 'POST') {
      return performSync(env);
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },

  // Cron trigger handler
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());
    ctx.waitUntil(performSync(env));
  },
};
