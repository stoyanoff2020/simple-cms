import { Article, PaginationOptions, PaginatedResult } from '../models';
import { publicArticleRepository } from '../repositories/PublicArticleRepository';

export interface IPublicArticleService {
  getPublishedArticles(pagination: PaginationOptions): Promise<PaginatedResult<Article>>;
  getPublishedArticleById(id: string): Promise<Article | null>;
  getRelatedArticles(articleId: string, limit?: number): Promise<Article[]>;
}

export class PublicArticleService implements IPublicArticleService {
  /**
   * Get all published articles with pagination and optional date range filtering
   */
  async getPublishedArticles(
    pagination: PaginationOptions,
    dateRange?: { startDate?: Date; endDate?: Date }
  ): Promise<PaginatedResult<Article>> {
    return await publicArticleRepository.findPublished(pagination, dateRange);
  }

  /**
   * Get a published article by ID
   */
  async getPublishedArticleById(id: string): Promise<Article | null> {
    if (!id) {
      throw new Error('Article ID is required');
    }

    return await publicArticleRepository.findPublishedById(id);
  }

  /**
   * Get related articles based on shared categories and tags
   */
  async getRelatedArticles(articleId: string, limit: number = 5): Promise<Article[]> {
    if (!articleId) {
      throw new Error('Article ID is required');
    }

    return await publicArticleRepository.findRelatedArticles(articleId, limit);
  }
}

export const publicArticleService = new PublicArticleService();