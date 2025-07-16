import { Pool } from 'pg';
import { Article } from '../../models';
import { SearchFilters, SearchResult, SearchService } from '../SearchService';
import { db } from '../../database/connection';

export class PostgresSearchService implements SearchService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || db.getPool();
  }

  /**
   * Search for articles using PostgreSQL full-text search
   * @param query Search query string
   * @param filters Optional filters to narrow search results
   * @returns Array of search results with relevance scores
   */
  async searchArticles(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty');
    }

    // Convert query to tsquery format
    const searchQuery = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(term => `${term}:*`)
      .join(' & ');

    let sql = `
      SELECT 
        a.*,
        ts_rank(a.search_vector, to_tsquery('english', $1)) as relevance_score,
        ARRAY(
          SELECT CASE
            WHEN a.search_vector @@ to_tsquery('english', 'title:' || $1) THEN 'title'
            WHEN a.search_vector @@ to_tsquery('english', 'content:' || $1) THEN 'content'
            WHEN a.search_vector @@ to_tsquery('english', 'excerpt:' || $1) THEN 'excerpt'
            ELSE 'unknown'
          END
        ) as matched_fields
      FROM articles a
      WHERE a.search_vector @@ to_tsquery('english', $1)
    `;

    const values: any[] = [searchQuery];
    let paramIndex = 2;

    // Add filters if provided
    if (filters) {
      if (filters.status) {
        sql += ` AND a.status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      } else {
        // Default to published articles only
        sql += ` AND a.status = 'published'`;
      }

      if (filters.authorId) {
        sql += ` AND a.author_id = $${paramIndex}`;
        values.push(filters.authorId);
        paramIndex++;
      }

      if (filters.dateFrom) {
        sql += ` AND a.published_at >= $${paramIndex}`;
        values.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        sql += ` AND a.published_at <= $${paramIndex}`;
        values.push(filters.dateTo);
        paramIndex++;
      }

      if (filters.categoryIds && filters.categoryIds.length > 0) {
        sql += ` AND a.id IN (
          SELECT article_id FROM article_categories 
          WHERE category_id IN (${filters.categoryIds.map((_, i) => `$${paramIndex + i}`).join(',')})
        )`;
        values.push(...filters.categoryIds);
        paramIndex += filters.categoryIds.length;
      }

      if (filters.tagIds && filters.tagIds.length > 0) {
        sql += ` AND a.id IN (
          SELECT article_id FROM article_tags 
          WHERE tag_id IN (${filters.tagIds.map((_, i) => `$${paramIndex + i}`).join(',')})
        )`;
        values.push(...filters.tagIds);
        paramIndex += filters.tagIds.length;
      }
    } else {
      // Default to published articles only if no filters provided
      sql += ` AND a.status = 'published'`;
    }

    // Order by relevance score
    sql += ` ORDER BY relevance_score DESC`;

    const result = await this.pool.query(sql, values);
    
    return result.rows.map(row => ({
      article: {
        id: row.id,
        title: row.title,
        content: row.content,
        excerpt: row.excerpt,
        authorId: row.author_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        publishedAt: row.published_at,
        categoryIds: [], // We'll need to fetch these separately in a real implementation
        tagIds: []      // We'll need to fetch these separately in a real implementation
      } as Article,
      relevanceScore: parseFloat(row.relevance_score),
      matchedFields: row.matched_fields || []
    }));
  }

  /**
   * Index or reindex an article in the search index
   * Note: PostgreSQL handles this automatically via triggers,
   * but this method can be used to manually update the search vector
   * @param article Article to index
   */
  async indexArticle(article: Article): Promise<void> {
    const sql = `
      UPDATE articles
      SET search_vector = 
        setweight(to_tsvector('english', $1), 'A') ||
        setweight(to_tsvector('english', $2), 'B') ||
        setweight(to_tsvector('english', $3), 'C')
      WHERE id = $4
    `;

    await this.pool.query(sql, [
      article.title || '',
      article.content || '',
      article.excerpt || '',
      article.id
    ]);
  }

  /**
   * Remove an article from the search index
   * Note: This is handled by database CASCADE DELETE,
   * but included for completeness of the interface
   * @param articleId ID of article to remove
   */
  async removeFromIndex(_articleId: string): Promise<void> {
    // In PostgreSQL, this is handled by CASCADE DELETE
    // This method is included for API completeness
    // No action needed as deleting the article will remove it from search results
  }

  /**
   * Get search suggestions based on partial query
   * @param partialQuery Partial search query
   * @returns Array of suggested search terms
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    if (!partialQuery.trim()) {
      return [];
    }

    // Get suggestions from article titles that match the partial query
    const sql = `
      SELECT DISTINCT word FROM ts_stat(
        'SELECT to_tsvector(''english'', title) FROM articles'
      ) WHERE word ILIKE $1 ORDER BY ndoc DESC, nentry DESC LIMIT 10
    `;

    const result = await this.pool.query(sql, [`${partialQuery}%`]);
    return result.rows.map(row => row.word);
  }
}