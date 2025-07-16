// Article controller
import { Request, Response } from 'express';
import { articleService } from '../services/ArticleService';
import { CreateArticleRequest, UpdateArticleRequest } from '../models/Article';

export class ArticleController {
  /**
   * POST /articles - Create a new article
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const articleData: CreateArticleRequest = {
        title: req.body.title,
        content: req.body.content,
        excerpt: req.body.excerpt,
        status: req.body.status || 'draft',
        categoryIds: req.body.categoryIds || [],
        tagIds: req.body.tagIds || []
      };

      const article = await articleService.create(articleData, req.user.userId);

      res.status(201).json({
        success: true,
        data: article,
        message: 'Article created successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('required') || errorMessage.includes('cannot be empty')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create article',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * GET /articles/:id - Get article by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Article ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const article = await articleService.getById(id);

      if (!article) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if user can access this article
      // Published articles are public, drafts only visible to author
      if (article.status !== 'published') {
        if (!req.user || req.user.userId !== article.authorId) {
          res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this article',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }
      }

      res.status(200).json({
        success: true,
        data: article
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve article',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * PUT /articles/:id - Update article
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Article ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if article exists and user owns it
      const existingArticle = await articleService.getById(id);
      if (!existingArticle) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only author can update their article
      if (req.user.userId !== existingArticle.authorId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own articles',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const updates: UpdateArticleRequest = {
        title: req.body.title,
        content: req.body.content,
        excerpt: req.body.excerpt,
        status: req.body.status,
        categoryIds: req.body.categoryIds,
        tagIds: req.body.tagIds
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof UpdateArticleRequest] === undefined) {
          delete updates[key as keyof UpdateArticleRequest];
        }
      });

      const updatedArticle = await articleService.update(id, updates);

      res.status(200).json({
        success: true,
        data: updatedArticle,
        message: 'Article updated successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else if (errorMessage.includes('required') || errorMessage.includes('cannot be empty')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update article',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * DELETE /articles/:id - Delete article (soft delete)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Article ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if article exists and user owns it
      const existingArticle = await articleService.getById(id);
      if (!existingArticle) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only author can delete their article
      if (req.user.userId !== existingArticle.authorId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own articles',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await articleService.delete(id);

      res.status(200).json({
        success: true,
        message: 'Article deleted successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete article',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * GET /articles - Get all articles with pagination and filtering
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const categoryId = req.query.categoryId as string;
      const tagId = req.query.tagId as string;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = (req.query.sortOrder as string) || 'desc';

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate sort parameters
      const validSortFields = ['created_at', 'updated_at', 'published_at', 'title'];
      const validSortOrders = ['asc', 'desc'];
      
      if (!validSortFields.includes(sortBy)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid sortBy field. Must be one of: ${validSortFields.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!validSortOrders.includes(sortOrder)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid sortOrder. Must be "asc" or "desc"',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const paginationOptions = {
        page,
        limit,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      let result;

      // Handle different filtering scenarios
      if (categoryId) {
        result = await articleService.getByCategory(categoryId, paginationOptions);
      } else if (tagId) {
        result = await articleService.getByTag(tagId, paginationOptions);
      } else if (status === 'published') {
        result = await articleService.getPublished(paginationOptions);
      } else if (status && req.user) {
        // For non-published status, user must be authenticated
        result = await articleService.getAllWithStatus(status as 'draft' | 'archived', paginationOptions);
      } else if (!status) {
        // No status filter - return published articles for unauthenticated users
        // or all articles for authenticated users
        if (req.user) {
          result = await articleService.getAll(paginationOptions);
        } else {
          result = await articleService.getPublished(paginationOptions);
        }
      } else {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to view non-published articles',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve articles',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * PUT /articles/:id/publish - Publish an article
   */
  static async publish(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Article ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if article exists and user owns it
      const existingArticle = await articleService.getById(id);
      if (!existingArticle) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only author can publish their article
      if (req.user.userId !== existingArticle.authorId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only publish your own articles',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const publishedArticle = await articleService.publish(id);

      res.status(200).json({
        success: true,
        data: publishedArticle,
        message: 'Article published successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else if (errorMessage.includes('already published') || errorMessage.includes('cannot publish')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to publish article',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * PUT /articles/:id/unpublish - Unpublish an article (set to draft)
   */
  static async unpublish(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Article ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if article exists and user owns it
      const existingArticle = await articleService.getById(id);
      if (!existingArticle) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only author can unpublish their article
      if (req.user.userId !== existingArticle.authorId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only unpublish your own articles',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const unpublishedArticle = await articleService.unpublish(id);

      res.status(200).json({
        success: true,
        data: unpublishedArticle,
        message: 'Article unpublished successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else if (errorMessage.includes('not published') || errorMessage.includes('cannot unpublish')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to unpublish article',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * PUT /articles/:id/archive - Archive an article
   */
  static async archive(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Article ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if article exists and user owns it
      const existingArticle = await articleService.getById(id);
      if (!existingArticle) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only author can archive their article
      if (req.user.userId !== existingArticle.authorId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only archive your own articles',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const archivedArticle = await articleService.archive(id);

      res.status(200).json({
        success: true,
        data: archivedArticle,
        message: 'Article archived successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to archive article',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * PUT /articles/:id/draft - Save article as draft
   */
  static async saveDraft(req: Request, res: Response): Promise<void> {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Article ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if article exists and user owns it
      const existingArticle = await articleService.getById(id);
      if (!existingArticle) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only author can save drafts of their article
      if (req.user.userId !== existingArticle.authorId) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only save drafts of your own articles',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const updates = {
        title: req.body.title,
        content: req.body.content,
        excerpt: req.body.excerpt,
        categoryIds: req.body.categoryIds,
        tagIds: req.body.tagIds
      };

      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key as keyof typeof updates] === undefined) {
          delete updates[key as keyof typeof updates];
        }
      });

      const savedDraft = await articleService.saveDraft(id, updates);

      res.status(200).json({
        success: true,
        data: savedDraft,
        message: 'Draft saved successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else if (errorMessage.includes('too long')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to save draft',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  /**
   * GET /articles/author/:authorId - Get articles by specific author
   */
  static async getByAuthor(req: Request, res: Response): Promise<void> {
    try {
      const { authorId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortBy = req.query.sortBy as string || 'created_at';
      const sortOrder = (req.query.sortOrder as string) || 'desc';

      if (!authorId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Author ID is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate pagination parameters
      if (page < 1 || limit < 1 || limit > 100) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate sort parameters
      const validSortFields = ['created_at', 'updated_at', 'published_at', 'title'];
      const validSortOrders = ['asc', 'desc'];
      
      if (!validSortFields.includes(sortBy)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid sortBy field. Must be one of: ${validSortFields.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (!validSortOrders.includes(sortOrder)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid sortOrder. Must be "asc" or "desc"',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const paginationOptions = {
        page,
        limit,
        sortBy,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      // If user is authenticated and viewing their own articles, show all statuses
      // Otherwise, only show published articles
      let result;
      if (req.user && req.user.userId === authorId) {
        result = await articleService.getByAuthor(authorId, paginationOptions);
      } else {
        result = await articleService.getByAuthorPublished(authorId, paginationOptions);
      }

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve articles by author',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }
}