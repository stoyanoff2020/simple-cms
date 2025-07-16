import { PoolClient } from 'pg';
import { db } from '../database/connection';
import { Article, CreateArticleRequest, UpdateArticleRequest, PaginationOptions, PaginatedResult } from '../models/Article';

export class ArticleRepository {
  async findByCategoryId(categoryId: string): Promise<Article[]> {
    const query = `
      SELECT DISTINCT
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      JOIN article_categories ac ON a.id = ac.article_id
      WHERE ac.category_id = $1 AND a.status = 'published'
      ORDER BY a.published_at DESC
    `;
    
    const result = await db.query(query, [categoryId]);
    const articles = await Promise.all(
      result.rows.map(async (row: any) => {
        const article = this.mapRowToArticle(row);
        article.categoryIds = await this.getArticleCategoryIds(article.id);
        article.tagIds = await this.getArticleTagIds(article.id);
        return article;
      })
    );
    
    return articles;
  }
  async create(articleData: CreateArticleRequest, authorId: string): Promise<Article> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Insert the article
      const articleQuery = `
        INSERT INTO articles (title, content, excerpt, author_id, status, published_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, content, excerpt, author_id, status, created_at, updated_at, published_at
      `;
      
      const publishedAt = articleData.status === 'published' ? new Date() : null;
      const articleValues = [
        articleData.title,
        articleData.content,
        articleData.excerpt || null,
        authorId,
        articleData.status || 'draft',
        publishedAt
      ];
      
      const articleResult = await client.query(articleQuery, articleValues);
      const article = articleResult.rows[0];
      
      // Handle category associations
      if (articleData.categoryIds && articleData.categoryIds.length > 0) {
        await this.associateCategories(client, article.id, articleData.categoryIds);
      }
      
      // Handle tag associations
      if (articleData.tagIds && articleData.tagIds.length > 0) {
        await this.associateTags(client, article.id, articleData.tagIds);
      }
      
      await client.query('COMMIT');
      
      // Fetch and return the complete article with associations
      return await this.findById(article.id) as Article;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Article | null> {
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      WHERE a.id = $1
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

  async update(id: string, updates: UpdateArticleRequest): Promise<Article | null> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      const setClause: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.title !== undefined) {
        setClause.push(`title = $${paramCount++}`);
        values.push(updates.title);
      }

      if (updates.content !== undefined) {
        setClause.push(`content = $${paramCount++}`);
        values.push(updates.content);
      }

      if (updates.excerpt !== undefined) {
        setClause.push(`excerpt = $${paramCount++}`);
        values.push(updates.excerpt);
      }

      if (updates.status !== undefined) {
        setClause.push(`status = $${paramCount++}`);
        values.push(updates.status);
        
        // Update published_at when status changes to published
        if (updates.status === 'published') {
          setClause.push(`published_at = COALESCE(published_at, CURRENT_TIMESTAMP)`);
        } else if (updates.status === 'draft' || updates.status === 'archived') {
          // When unpublishing, we keep the publishedAt date for historical reference
          // but when explicitly setting to draft (not unpublishing), we clear it
          if (updates.clearPublishedAt) {
            setClause.push(`published_at = NULL`);
          }
        }
      }

      if (setClause.length > 0) {
        setClause.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
          UPDATE articles
          SET ${setClause.join(', ')}
          WHERE id = $${paramCount}
        `;

        await client.query(query, values);
      }
      
      // Handle category associations
      if (updates.categoryIds !== undefined) {
        await this.updateCategoryAssociations(client, id, updates.categoryIds);
      }
      
      // Handle tag associations
      if (updates.tagIds !== undefined) {
        await this.updateTagAssociations(client, id, updates.tagIds);
      }
      
      await client.query('COMMIT');
      
      // Return updated article
      return await this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Remove associations (handled by CASCADE, but explicit for clarity)
      await client.query('DELETE FROM article_categories WHERE article_id = $1', [id]);
      await client.query('DELETE FROM article_tags WHERE article_id = $1', [id]);
      
      // Delete the article
      const result = await client.query('DELETE FROM articles WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return (result.rowCount || 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByAuthor(authorId: string, options?: PaginationOptions): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM articles WHERE author_id = $1';
    const countResult = await db.query(countQuery, [authorId]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      WHERE a.author_id = $1
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [authorId, limit, offset]);
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

  async findPublished(options?: PaginationOptions): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'published_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM articles WHERE status = $1';
    const countResult = await db.query(countQuery, ['published']);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      WHERE a.status = 'published'
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [limit, offset]);
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

  async findByCategory(categoryId: string, options?: PaginationOptions): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'published_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT a.id)
      FROM articles a
      JOIN article_categories ac ON a.id = ac.article_id
      WHERE ac.category_id = $1 AND a.status = 'published'
    `;
    const countResult = await db.query(countQuery, [categoryId]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT DISTINCT
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      JOIN article_categories ac ON a.id = ac.article_id
      WHERE ac.category_id = $1 AND a.status = 'published'
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [categoryId, limit, offset]);
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

  async findByTag(tagId: string, options?: PaginationOptions): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'published_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT a.id)
      FROM articles a
      JOIN article_tags at ON a.id = at.article_id
      WHERE at.tag_id = $1 AND a.status = 'published'
    `;
    const countResult = await db.query(countQuery, [tagId]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT DISTINCT
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      JOIN article_tags at ON a.id = at.article_id
      WHERE at.tag_id = $1 AND a.status = 'published'
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [tagId, limit, offset]);
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

  async findByAuthorPublished(authorId: string, options?: PaginationOptions): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'published_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM articles WHERE author_id = $1 AND status = $2';
    const countResult = await db.query(countQuery, [authorId, 'published']);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      WHERE a.author_id = $1 AND a.status = 'published'
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [authorId, limit, offset]);
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

  async findAll(options?: PaginationOptions): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM articles';
    const countResult = await db.query(countQuery);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.query(query, [limit, offset]);
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

  async findByStatus(status: 'draft' | 'archived', options?: PaginationOptions): Promise<PaginatedResult<Article>> {
    const limit = options?.limit || 10;
    const offset = ((options?.page || 1) - 1) * limit;
    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM articles WHERE status = $1';
    const countResult = await db.query(countQuery, [status]);
    const total = parseInt(countResult.rows[0].count);
    
    // Get articles
    const query = `
      SELECT 
        a.id, a.title, a.content, a.excerpt, a.author_id, a.status,
        a.created_at, a.updated_at, a.published_at
      FROM articles a
      WHERE a.status = $1
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [status, limit, offset]);
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

  // Helper methods for associations
  private async associateCategories(client: PoolClient, articleId: string, categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) return;
    
    const values = categoryIds.map((_categoryId, index) => 
      `($1, $${index + 2})`
    ).join(', ');
    
    const query = `INSERT INTO article_categories (article_id, category_id) VALUES ${values}`;
    await client.query(query, [articleId, ...categoryIds]);
  }

  private async associateTags(client: PoolClient, articleId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    
    const values = tagIds.map((_tagId, index) => 
      `($1, $${index + 2})`
    ).join(', ');
    
    const query = `INSERT INTO article_tags (article_id, tag_id) VALUES ${values}`;
    await client.query(query, [articleId, ...tagIds]);
  }

  private async updateCategoryAssociations(client: PoolClient, articleId: string, categoryIds: string[]): Promise<void> {
    // Remove existing associations
    await client.query('DELETE FROM article_categories WHERE article_id = $1', [articleId]);
    
    // Add new associations
    if (categoryIds.length > 0) {
      await this.associateCategories(client, articleId, categoryIds);
    }
  }

  private async updateTagAssociations(client: PoolClient, articleId: string, tagIds: string[]): Promise<void> {
    // Remove existing associations
    await client.query('DELETE FROM article_tags WHERE article_id = $1', [articleId]);
    
    // Add new associations
    if (tagIds.length > 0) {
      await this.associateTags(client, articleId, tagIds);
    }
  }

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

export const articleRepository = new ArticleRepository();