/**
 * D1 Database queries for articles
 * Replaces Notion API calls with fast D1 queries
 */

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

// Helper to parse JSON fields
function parseArticleRow(row: any): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || '',
    publishDate: row.publish_date || '',
    author: row.author ? JSON.parse(row.author) : [],
    topics: row.topics ? JSON.parse(row.topics) : [],
    whyItMatters: row.why_it_matters || '',
    status: row.status || 'Published',
    content: row.content ? JSON.parse(row.content) : null,
    coverImage: row.cover_image || undefined,
  };
}

/**
 * Get published articles with optional topic filter and pagination
 */
export async function getPublishedArticles(
  db: D1Database,
  topic?: string,
  pageSize: number = 12,
  startCursor?: string
): Promise<{ articles: Article[]; hasMore: boolean; nextCursor: string | null }> {
  try {

    // Build query with optional topic filter
    let query = `
      SELECT id, title, slug, excerpt, publish_date, author, topics,
             why_it_matters, status, cover_image, NULL as content
      FROM articles
      WHERE status = 'Published'
    `;

    const params: any[] = [];

    // Add topic filter if provided
    if (topic) {
      query += ` AND topics LIKE ?`;
      params.push(`%"${topic}"%`);
    }

    // Add ordering and pagination
    query += ` ORDER BY publish_date DESC`;

    // Handle cursor-based pagination
    let offset = 0;
    if (startCursor) {
      offset = parseInt(startCursor, 10);
      if (isNaN(offset)) offset = 0;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize + 1, offset); // Fetch one extra to check if there's more

    // Execute query
    const result = await db.prepare(query).bind(...params).all();

    // Check if there are more results
    const hasMore = result.results.length > pageSize;
    const articles = result.results
      .slice(0, pageSize)
      .map(parseArticleRow);

    // Calculate next cursor
    const nextCursor = hasMore ? String(offset + pageSize) : null;

    return {
      articles,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error('Error fetching articles from D1:', error);
    return { articles: [], hasMore: false, nextCursor: null };
  }
}

/**
 * Get a single article by slug
 */
export async function getArticleBySlug(db: D1Database, slug: string): Promise<Article | null> {
  try {

    const result = await db
      .prepare(`
        SELECT id, title, slug, excerpt, publish_date, author, topics,
               why_it_matters, status, cover_image, content
        FROM articles
        WHERE slug = ? AND status = 'Published'
        LIMIT 1
      `)
      .bind(slug)
      .first();

    if (!result) {
      return null;
    }

    return parseArticleRow(result);
  } catch (error) {
    console.error('Error fetching article by slug from D1:', error);
    return null;
  }
}

/**
 * Search articles by query string
 * Uses full-text search (FTS) for fast searching across title, excerpt, and why_it_matters
 */
export async function searchArticles(
  db: D1Database,
  query: string,
  pageSize: number = 12,
  offset: number = 0
): Promise<{ articles: Article[]; hasMore: boolean; total: number }> {
  try {

    // Sanitize query for FTS5
    const sanitizedQuery = query.trim().replace(/[^\w\s]/g, '');
    if (!sanitizedQuery) {
      return { articles: [], hasMore: false, total: 0 };
    }

    // Search using FTS5
    const searchQuery = `
      SELECT a.id, a.title, a.slug, a.excerpt, a.publish_date, a.author,
             a.topics, a.why_it_matters, a.status, a.cover_image, NULL as content,
             rank
      FROM articles_fts
      JOIN articles a ON articles_fts.rowid = a.rowid
      WHERE articles_fts MATCH ? AND a.status = 'Published'
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    const result = await db
      .prepare(searchQuery)
      .bind(sanitizedQuery, pageSize + 1, offset)
      .all();

    // Get total count
    const countResult = await db
      .prepare(`
        SELECT COUNT(*) as total
        FROM articles_fts
        JOIN articles a ON articles_fts.rowid = a.rowid
        WHERE articles_fts MATCH ? AND a.status = 'Published'
      `)
      .bind(sanitizedQuery)
      .first();

    const total = (countResult as any)?.total || 0;

    // Check if there are more results
    const hasMore = result.results.length > pageSize;
    const articles = result.results
      .slice(0, pageSize)
      .map(parseArticleRow);

    return {
      articles,
      hasMore,
      total,
    };
  } catch (error) {
    console.error('Error searching articles:', error);
    return { articles: [], hasMore: false, total: 0 };
  }
}

/**
 * Get related articles based on shared topics
 * Excludes the current article
 */
export async function getRelatedArticles(
  db: D1Database,
  articleSlug: string,
  limit: number = 3
): Promise<Article[]> {
  try {

    // First, get the current article's topics
    const currentArticle = await db
      .prepare('SELECT topics FROM articles WHERE slug = ? AND status = "Published"')
      .bind(articleSlug)
      .first();

    if (!currentArticle || !(currentArticle as any).topics) {
      return [];
    }

    const topics: string[] = JSON.parse((currentArticle as any).topics);
    if (topics.length === 0) {
      return [];
    }

    // Build query to find articles with matching topics
    // We'll use a simple LIKE match for each topic and rank by number of matches
    const topicConditions = topics.map(() => 'topics LIKE ?').join(' OR ');

    const query = `
      SELECT id, title, slug, excerpt, publish_date, author, topics,
             why_it_matters, status, cover_image, NULL as content
      FROM articles
      WHERE slug != ? AND status = 'Published' AND (${topicConditions})
      ORDER BY publish_date DESC
      LIMIT ?
    `;

    const params = [
      articleSlug,
      ...topics.map(t => `%"${t}"%`),
      limit,
    ];

    const result = await db.prepare(query).bind(...params).all();

    return result.results.map(parseArticleRow);
  } catch (error) {
    console.error('Error fetching related articles:', error);
    return [];
  }
}

/**
 * Get all unique topics from published articles
 */
export async function getAllTopics(db: D1Database): Promise<string[]> {
  try {

    const result = await db
      .prepare('SELECT DISTINCT topics FROM articles WHERE status = "Published"')
      .all();

    // Flatten and deduplicate topics
    const topicsSet = new Set<string>();
    for (const row of result.results) {
      if ((row as any).topics) {
        const topics: string[] = JSON.parse((row as any).topics);
        topics.forEach(t => topicsSet.add(t));
      }
    }

    return Array.from(topicsSet).sort();
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

/**
 * Get article count by topic
 */
export async function getArticleCountByTopic(db: D1Database): Promise<Record<string, number>> {
  try {

    const result = await db
      .prepare('SELECT topics FROM articles WHERE status = "Published"')
      .all();

    const counts: Record<string, number> = {};

    for (const row of result.results) {
      if ((row as any).topics) {
        const topics: string[] = JSON.parse((row as any).topics);
        topics.forEach(topic => {
          counts[topic] = (counts[topic] || 0) + 1;
        });
      }
    }

    return counts;
  } catch (error) {
    console.error('Error counting articles by topic:', error);
    return {};
  }
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
