// Article service implementation
import { Article, CreateArticleRequest, UpdateArticleRequest, PaginationOptions, PaginatedResult } from '../models';
import { articleRepository } from '../repositories/ArticleRepository';

export interface IArticleService {
  create(articleData: CreateArticleRequest, authorId: string): Promise<Article>;
  update(id: string, updates: UpdateArticleRequest): Promise<Article>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Article | null>;
  getByAuthor(authorId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>>;
  getByAuthorPublished(authorId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>>;
  getPublished(pagination: PaginationOptions): Promise<PaginatedResult<Article>>;
  getAll(pagination: PaginationOptions): Promise<PaginatedResult<Article>>;
  getAllWithStatus(status: 'draft' | 'archived', pagination: PaginationOptions): Promise<PaginatedResult<Article>>;
  getByCategory(categoryId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>>;
  getByTag(tagId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>>;
  publish(id: string): Promise<Article>;
  unpublish(id: string): Promise<Article>;
  archive(id: string): Promise<Article>;
  saveDraft(id: string, updates: UpdateArticleRequest): Promise<Article>;
}

export class ArticleService implements IArticleService {
  async create(articleData: CreateArticleRequest, authorId: string): Promise<Article> {
    // Validate required fields
    if (!articleData.title?.trim()) {
      throw new Error('Article title is required');
    }
    
    if (!articleData.content?.trim()) {
      throw new Error('Article content is required');
    }

    // Create the article
    return await articleRepository.create(articleData, authorId);
  }

  async update(id: string, updates: UpdateArticleRequest): Promise<Article> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    // Check if article exists
    const existingArticle = await articleRepository.findById(id);
    if (!existingArticle) {
      throw new Error('Article not found');
    }

    // Validate updates
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error('Article title cannot be empty');
    }
    
    if (updates.content !== undefined && !updates.content.trim()) {
      throw new Error('Article content cannot be empty');
    }

    const updatedArticle = await articleRepository.update(id, updates);
    if (!updatedArticle) {
      throw new Error('Failed to update article');
    }

    return updatedArticle;
  }

  async delete(id: string): Promise<void> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    // Check if article exists
    const existingArticle = await articleRepository.findById(id);
    if (!existingArticle) {
      throw new Error('Article not found');
    }

    const deleted = await articleRepository.delete(id);
    if (!deleted) {
      throw new Error('Failed to delete article');
    }
  }

  async getById(id: string): Promise<Article | null> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    return await articleRepository.findById(id);
  }

  async getByAuthor(authorId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>> {
    if (!authorId) {
      throw new Error('Author ID is required');
    }

    return await articleRepository.findByAuthor(authorId, pagination);
  }

  async getByAuthorPublished(authorId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>> {
    if (!authorId) {
      throw new Error('Author ID is required');
    }

    return await articleRepository.findByAuthorPublished(authorId, pagination);
  }

  async getPublished(pagination: PaginationOptions): Promise<PaginatedResult<Article>> {
    return await articleRepository.findPublished(pagination);
  }

  async getAll(pagination: PaginationOptions): Promise<PaginatedResult<Article>> {
    return await articleRepository.findAll(pagination);
  }

  async getAllWithStatus(status: 'draft' | 'archived', pagination: PaginationOptions): Promise<PaginatedResult<Article>> {
    return await articleRepository.findByStatus(status, pagination);
  }

  async getByCategory(categoryId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>> {
    if (!categoryId) {
      throw new Error('Category ID is required');
    }

    return await articleRepository.findByCategory(categoryId, pagination);
  }

  async getByTag(tagId: string, pagination?: PaginationOptions): Promise<PaginatedResult<Article>> {
    if (!tagId) {
      throw new Error('Tag ID is required');
    }

    return await articleRepository.findByTag(tagId, pagination);
  }

  async publish(id: string): Promise<Article> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    // Check if article exists
    const existingArticle = await articleRepository.findById(id);
    if (!existingArticle) {
      throw new Error('Article not found');
    }

    // Validate article can be published
    if (existingArticle.status === 'published') {
      throw new Error('Article is already published');
    }

    // Validate article has required content for publishing
    if (!existingArticle.title?.trim()) {
      throw new Error('Cannot publish article without a title');
    }

    if (!existingArticle.content?.trim()) {
      throw new Error('Cannot publish article without content');
    }

    // Update status to published and set publishedAt timestamp
    const updatedArticle = await articleRepository.update(id, { 
      status: 'published' 
    });

    if (!updatedArticle) {
      throw new Error('Failed to publish article');
    }

    return updatedArticle;
  }

  async unpublish(id: string): Promise<Article> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    // Check if article exists
    const existingArticle = await articleRepository.findById(id);
    if (!existingArticle) {
      throw new Error('Article not found');
    }

    // Validate article can be unpublished
    if (existingArticle.status !== 'published') {
      throw new Error('Article is not published');
    }

    // Update status to draft and clear publishedAt timestamp
    const updatedArticle = await articleRepository.update(id, { 
      status: 'draft' 
    });

    if (!updatedArticle) {
      throw new Error('Failed to unpublish article');
    }

    return updatedArticle;
  }

  async archive(id: string): Promise<Article> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    // Check if article exists
    const existingArticle = await articleRepository.findById(id);
    if (!existingArticle) {
      throw new Error('Article not found');
    }

    // Validate article can be archived
    if (existingArticle.status === 'archived') {
      throw new Error('Article is already archived');
    }

    // Update status to archived
    const updatedArticle = await articleRepository.update(id, { 
      status: 'archived' 
    });

    if (!updatedArticle) {
      throw new Error('Failed to archive article');
    }

    return updatedArticle;
  }

  async saveDraft(id: string, updates: UpdateArticleRequest): Promise<Article> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    // Check if article exists
    const existingArticle = await articleRepository.findById(id);
    if (!existingArticle) {
      throw new Error('Article not found');
    }

    // Ensure we're saving as draft and validate basic fields
    const draftUpdates: UpdateArticleRequest = {
      ...updates,
      status: 'draft'
    };

    // Allow empty title/content for drafts, but validate if provided
    if (draftUpdates.title !== undefined && typeof draftUpdates.title === 'string' && draftUpdates.title.length > 1000) {
      throw new Error('Article title is too long (max 1000 characters)');
    }
    
    if (draftUpdates.content !== undefined && typeof draftUpdates.content === 'string' && draftUpdates.content.length > 100000) {
      throw new Error('Article content is too long (max 100,000 characters)');
    }

    const updatedArticle = await articleRepository.update(id, draftUpdates);
    if (!updatedArticle) {
      throw new Error('Failed to save draft');
    }

    return updatedArticle;
  }
}

export const articleService = new ArticleService();