/**
 * Direct Notion API calls using fetch (works in Cloudflare Workers)
 * This replaces the @notionhq/client package which doesn't work well in Workers
 */

import { getCachedData, setCachedData, CACHE_KEYS } from "./cache";

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishDate: string;
  author: string[];
  topics: string[];
  whyItMatters: string;
  status: string;
  content: any;
  coverImage?: string;
}

// Get environment variables
function getApiKey(): string {
  if (typeof process !== 'undefined' && process.env?.NOTION_API_KEY) {
    return process.env.NOTION_API_KEY;
  }
  return import.meta.env.NOTION_API_KEY || '';
}

function getDatabaseId(): string {
  if (typeof process !== 'undefined' && process.env?.NOTION_DATABASE_ID) {
    return process.env.NOTION_DATABASE_ID;
  }
  return import.meta.env.NOTION_DATABASE_ID || "2e12d00c-e384-80a9-a895-f2efbe619de9";
}

// Direct fetch to Notion API
async function notionFetch(endpoint: string, body?: any) {
  const apiKey = getApiKey();

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

export async function getPublishedArticles(
  topic?: string,
  pageSize: number = 12,
  startCursor?: string
): Promise<{ articles: Article[]; hasMore: boolean; nextCursor: string | null }> {
  const cacheKey = CACHE_KEYS.articles(topic, startCursor);
  const cached = await getCachedData<{ articles: Article[]; hasMore: boolean; nextCursor: string | null }>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const DATABASE_ID = getDatabaseId();

    const filter: any = {
      property: "Status",
      status: {
        equals: "Published",
      },
    };

    const filters: any[] = [filter];
    if (topic) {
      filters.push({
        property: "Topic",
        multi_select: {
          contains: topic,
        },
      });
    }

    const response = await notionFetch(`/databases/${DATABASE_ID}/query`, {
      filter: filters.length > 1 ? { and: filters } : filter,
      sorts: [
        {
          property: "Publish Date",
          direction: "descending",
        },
      ],
      page_size: pageSize,
      start_cursor: startCursor || undefined,
    });

    const articles = response.results
      .map((page: any) => extractArticleData(page));

    const result = {
      articles,
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    };

    await setCachedData(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error fetching articles:", error);
    return { articles: [], hasMore: false, nextCursor: null };
  }
}

// Fetch all blocks for a page (with pagination for long articles)
async function fetchAllBlocks(pageId: string): Promise<any[]> {
  let allBlocks: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await notionFetch(`/blocks/${pageId}/children${cursor ? `?start_cursor=${cursor}` : ''}`);

    allBlocks = allBlocks.concat(response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;

    // Safety limit to prevent infinite loops
    if (allBlocks.length > 1000) {
      console.warn(`Article ${pageId} has over 1000 blocks, stopping pagination`);
      break;
    }
  }

  return allBlocks;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const cacheKey = CACHE_KEYS.article(slug);
  const cached = await getCachedData<Article | null>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const DATABASE_ID = getDatabaseId();

    const response = await notionFetch(`/databases/${DATABASE_ID}/query`, {
      filter: {
        and: [
          {
            property: "Slug",
            rich_text: {
              equals: slug,
            },
          },
          {
            property: "Status",
            status: {
              equals: "Published",
            },
          },
        ],
      },
    });

    if (response.results.length === 0) {
      return null;
    }

    const page = response.results[0];
    const article = extractArticleData(page);

    // Fetch ALL page content with pagination (fixes long article cutoff issue)
    article.content = await fetchAllBlocks(page.id);

    await setCachedData(cacheKey, article);

    return article;
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
}

function extractArticleData(page: any): Article {
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

  // First, try to get from "Cover Image" property (files type)
  if (properties["Cover Image"]?.type === "files" && properties["Cover Image"].files?.length > 0) {
    const file = properties["Cover Image"].files[0];
    if (file.type === "external") {
      coverImage = file.external?.url;
    } else if (file.type === "file") {
      coverImage = file.file?.url;
    }
  }

  // Fallback to page cover if property not found
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
    content: null,
    coverImage,
  };
}

export const TOPICS = [
  "Economics",
  "Electricity",
  "Politics",
  "Crime",
  "Community",
  "International",
  "Geopolitics",
  "Environment",
  "Education",
  "Sport",
  "Rugby",
  "Local Governance",
];
