import { db } from '../database/connection';
import { Article, PaginationOptions, PaginatedResult } from '../models/Article';
import { articleRepository } from './ArticleRepository';

export class PublicArticleRepository {
  /**
   * Find published articles with pagination
   */
  async findPublished(
    options?: PaginationOptions, 
    dateRange?: { startDate?: Date; endDate?: Date }
  ): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'published_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Build WHERE clause for date range filtering
    let whereClause = 'a.status = $1';
    const queryParams: any[] = ['published'];
    
    if (dateRange?.startDate) {
      whereClause += ` AND a.published_at >= $${queryParams.length + 1}`;
      queryParams.push(dateRange.startDate);
    }
    
    if (dateRange?.endDate) {
      whereClause += ` AND a.published_at <= $${queryParams.length + 1}`;
      queryParams.push(dateRange.endDate);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM articles a WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      WHERE ${whereClause}
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const result = await db.query(query, [...queryParams, limit, offset]);
    const articles = await Promise.all(
      result.rows.map(async (row: any) => {
        const article = this.mapRowToArticle(row);
        article.categoryIds = await this.getArticleCategoryIds(article.id);
        article.tagIds = await this.getArticleTagIds(article.id);
        return article;
      })
    );
    
    return {
      data: articles,
      pagination: {
        page: options?.page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
/**
   * Find a published article by ID
   */
  async findPublishedById(id: string): Promise<Article | null> {
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      WHERE a.id = $1 AND a.status = 'published'
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const article = this.mapRowToArticle(result.rows[0]);
    
    // Fetch associated categories and tags
    article.categoryIds = await this.getArticleCategoryIds(id);
    article.tagIds = await this.getArticleTagIds(id);
    
    return article;
  }

  /**
   * Find related articles based on shared categories and tags
   */
  async findRelatedArticles(articleId: string, limit: number = 5): Promise<Article[]> {
    // Get the article's categories and tags
    const article = await articleRepository.findById(articleId);
    
    if (!article || article.status !== 'published') {
      return [];
    }
    
    const categoryIds = article.categoryIds || [];
    const tagIds = article.tagIds || [];
    
    if (categoryIds.length === 0 && tagIds.length === 0) {
      // If no categories or tags, return recent articles
      const query = `
        SELECT 
          a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
          a.created_at, a.updated_at, a.published_at
        FROM articles a
        WHERE a.status = 'published' AND a.id != $1
        ORDER BY a.published_at DESC
        LIMIT $2
      `;
      
      const result = await db.query(query, [articleId, limit]);
      return Promise.all(
        result.rows.map(async (row: any) => {
          const relatedArticle = this.mapRowToArticle(row);
          relatedArticle.categoryIds = await this.getArticleCategoryIds(relatedArticle.id);
          relatedArticle.tagIds = await this.getArticleTagIds(relatedArticle.id);
          return relatedArticle;
        })
      );
    }
    
    // Find articles that share categories or tags, ordered by relevance (number of matches)
    const query = `
      WITH article_matches AS (
        SELECT 
          a.id,
          (
            -- Count matching categories
            (SELECT COUNT(*) FROM article_categories ac 
             WHERE ac.article_id = a.id AND ac.category_id IN (${categoryIds.length > 0 ? categoryIds.map((_, i) => `$${i + 2}`).join(',') : 'NULL'})) +
            -- Count matching tags
            (SELECT COUNT(*) FROM article_tags at 
             WHERE at.article_id = a.id AND at.tag_id IN (${tagIds.length > 0 ? tagIds.map((_, i) => `$${categoryIds.length + i + 2}`).join(',') : 'NULL'}))
          ) AS match_score
        FROM articles a
        WHERE a.status = 'published' AND a.id != $1
      )
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at, am.match_score
      FROM articles a
      JOIN article_matches am ON a.id = am.id
      WHERE am.match_score > 0
      ORDER BY am.match_score DESC, a.published_at DESC
      LIMIT $${categoryIds.length + tagIds.length + 2}
    `;
    
    const params = [articleId, ...categoryIds, ...tagIds, limit];
    const result = await db.query(query, params);
    
    return Promise.all(
      result.rows.map(async (row: any) => {
        const relatedArticle = this.mapRowToArticle(row);
        relatedArticle.categoryIds = await this.getArticleCategoryIds(relatedArticle.id);
        relatedArticle.tagIds = await this.getArticleTagIds(relatedArticle.id);
        return relatedArticle;
      })
    );
  }  
  
  /**
   * Helper methods
   */
  private async getArticleCategoryIds(articleId: string): Promise<string[]> {
    const query = 'SELECT category_id FROM article_categories WHERE article_id = $1';
    const result = await db.query(query, [articleId]);
    return result.rows.map((row: any) => row.category_id);
  }

  private async getArticleTagIds(articleId: string): Promise<string[]> {
    const query = 'SELECT tag_id FROM article_tags WHERE article_id = $1';
    const result = await db.query(query, [articleId]);
    return result.rows.map((row: any) => row.tag_id);
  }

  private mapRowToArticle(row: any): Article {
    const article: Article = {
      id: row.id,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      authorId: row.author_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      categoryIds: [], // Will be populated by calling methods
      tagIds: [] // Will be populated by calling methods
    };

    if (row.published_at) {
      article.publishedAt = new Date(row.published_at);
    }

    return article;
  }
}

export const publicArticleRepository = new PublicArticleRepository();