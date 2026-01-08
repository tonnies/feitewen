import { Client } from "@notionhq/client";
import type {
  QueryDatabaseResponse,
  PageObjectResponse,
  PartialPageObjectResponse
} from "@notionhq/client/build/src/api-endpoints";
import { getCachedData, setCachedData, CACHE_KEYS } from "./cache";

// Get API key from runtime environment
function getApiKey(): string {
  // Try to get from Cloudflare Worker environment
  if (typeof process !== 'undefined' && process.env?.NOTION_API_KEY) {
    return process.env.NOTION_API_KEY;
  }
  // Fallback to import.meta.env for dev
  return import.meta.env.NOTION_API_KEY || '';
}

function getDatabaseId(): string {
  if (typeof process !== 'undefined' && process.env?.NOTION_DATABASE_ID) {
    return process.env.NOTION_DATABASE_ID;
  }
  return import.meta.env.NOTION_DATABASE_ID || "2e12d00c-e384-80a9-a895-f2efbe619de9";
}

// Create client instance
function getNotionClient() {
  const apiKey = getApiKey();

  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error('NOTION_API_KEY is not properly configured');
  }

  return new Client({
    auth: apiKey,
  });
}

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
}

function isFullPage(page: PageObjectResponse | PartialPageObjectResponse): page is PageObjectResponse {
  return 'properties' in page;
}

export async function getPublishedArticles(
  topic?: string,
  pageSize: number = 12,
  startCursor?: string
): Promise<{ articles: Article[]; hasMore: boolean; nextCursor: string | null }> {
  // Try to get from cache first
  const cacheKey = CACHE_KEYS.articles(topic, startCursor);
  const cached = await getCachedData<{ articles: Article[]; hasMore: boolean; nextCursor: string | null }>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const notion = getNotionClient();
    const DATABASE_ID = getDatabaseId();

    const filter: any = {
      property: "Status",
      status: {
        equals: "Published",
      },
    };

    // Add topic filter if specified
    const filters: any[] = [filter];
    if (topic) {
      filters.push({
        property: "Topic",
        multi_select: {
          contains: topic,
        },
      });
    }

    const response: QueryDatabaseResponse = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: filters.length > 1 ? {
        and: filters,
      } : filter,
      sorts: [
        {
          property: "Publish Date",
          direction: "descending",
        },
      ],
      page_size: pageSize,
      start_cursor: startCursor,
    });

    const articles = response.results
      .filter(isFullPage)
      .map((page) => extractArticleData(page));

    const result = {
      articles,
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    };

    // Cache the result
    await setCachedData(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error fetching articles:", error);
    return { articles: [], hasMore: false, nextCursor: null };
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  // Try to get from cache first
  const cacheKey = CACHE_KEYS.article(slug);
  const cached = await getCachedData<Article | null>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const notion = getNotionClient();
    const DATABASE_ID = getDatabaseId();

    const response = await notion.databases.query({
      database_id: DATABASE_ID,
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
    if (!isFullPage(page)) {
      return null;
    }

    const article = extractArticleData(page);

    // Fetch page content
    const blocks = await notion.blocks.children.list({
      block_id: page.id,
    });

    article.content = blocks.results;

    // Cache the result
    await setCachedData(cacheKey, article);

    return article;
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    return null;
  }
}

export async function getAllArticleSlugs(): Promise<string[]> {
  // Try to get from cache first
  const cacheKey = CACHE_KEYS.slugs();
  const cached = await getCachedData<string[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const notion = getNotionClient();
    const DATABASE_ID = getDatabaseId();

    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: "Status",
        status: {
          equals: "Published",
        },
      },
    });

    const slugs = response.results
      .filter(isFullPage)
      .map((page) => {
        const slugProp = page.properties.Slug;
        if (slugProp.type === "rich_text" && slugProp.rich_text.length > 0) {
          return slugProp.rich_text[0].plain_text;
        }
        return "";
      })
      .filter((slug) => slug !== "");

    // Cache the result
    await setCachedData(cacheKey, slugs);

    return slugs;
  } catch (error) {
    console.error("Error fetching article slugs:", error);
    return [];
  }
}

function extractArticleData(page: PageObjectResponse): Article {
  const properties = page.properties;

  // Extract title
  let title = "";
  if (properties.Title?.type === "title") {
    title = properties.Title.title.map((t) => t.plain_text).join("");
  }

  // Extract slug
  let slug = "";
  if (properties.Slug?.type === "rich_text") {
    slug = properties.Slug.rich_text.map((t) => t.plain_text).join("");
  }

  // Extract excerpt
  let excerpt = "";
  if (properties.Excerpt?.type === "rich_text") {
    excerpt = properties.Excerpt.rich_text.map((t) => t.plain_text).join("");
  }

  // Extract publish date
  let publishDate = "";
  if (properties["Publish Date"]?.type === "date" && properties["Publish Date"].date) {
    publishDate = properties["Publish Date"].date.start;
  }

  // Extract author
  let author: string[] = [];
  if (properties.Author?.type === "people") {
    author = properties.Author.people.map((p) => p.name || "Unknown");
  }

  // Extract topics
  let topics: string[] = [];
  if (properties.Topic?.type === "multi_select") {
    topics = properties.Topic.multi_select.map((t) => t.name);
  }

  // Extract why it matters
  let whyItMatters = "";
  if (properties["Why It Matters"]?.type === "rich_text") {
    whyItMatters = properties["Why It Matters"].rich_text
      .map((t) => t.plain_text)
      .join("");
  }

  // Extract status
  let status = "";
  if (properties.Status?.type === "status" && properties.Status.status) {
    status = properties.Status.status.name;
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
