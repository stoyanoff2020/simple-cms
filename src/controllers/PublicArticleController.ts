import { Request, Response } from 'express';
import { publicArticleService } from '../services/PublicArticleService';

export class PublicArticleController {
  /**
   * GET /public/articles - Get all published articles with pagination and filtering
   */
  static async getPublishedArticles(req: Request, res: Response): Promise<void> {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortBy = req.query.sortBy as string || 'published_at';
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
      const validSortFields = ['published_at', 'title'];
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

      // Parse date range parameters
      const dateRange: { startDate?: Date; endDate?: Date } = {};
      
      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate as string);
        if (!isNaN(startDate.getTime())) {
          dateRange.startDate = startDate;
        } else {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid startDate format. Use ISO date format (YYYY-MM-DD)',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }
      }
      
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        if (!isNaN(endDate.getTime())) {
          dateRange.endDate = endDate;
        } else {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid endDate format. Use ISO date format (YYYY-MM-DD)',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }
      }

      // Validate date range
      if (dateRange.startDate && dateRange.endDate && dateRange.startDate > dateRange.endDate) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'startDate cannot be after endDate',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const result = await publicArticleService.getPublishedArticles(
        paginationOptions,
        Object.keys(dateRange).length > 0 ? dateRange : undefined
      );

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        filters: Object.keys(dateRange).length > 0 ? {
          dateRange: {
            startDate: dateRange.startDate?.toISOString(),
            endDate: dateRange.endDate?.toISOString()
          }
        } : undefined
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve published articles',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * GET /public/articles/:id - Get a published article by ID
   */
  static async getPublishedArticleById(req: Request, res: Response): Promise<void> {
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

      const article = await publicArticleService.getPublishedArticleById(id);

      if (!article) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Article not found or not published',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get related articles
      const limit = parseInt(req.query.relatedLimit as string) || 5;
      const relatedArticles = await publicArticleService.getRelatedArticles(id, limit);

      res.status(200).json({
        success: true,
        data: {
          article,
          relatedArticles
        }
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
            message: 'Failed to retrieve article',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }
}