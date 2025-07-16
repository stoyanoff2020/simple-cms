import { Request, Response } from 'express';
import { SearchService, PostgresSearchService, SearchFilters } from '../services';

export class SearchController {
  private searchService: SearchService;

  constructor(searchService?: SearchService) {
    this.searchService = searchService || new PostgresSearchService();
  }

  /**
   * Search for articles
   * GET /search?q=query&category=id&tag=id&author=id&status=published
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      
      if (!query || !query.trim()) {
        res.status(400).json({
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query cannot be empty'
          }
        });
        return;
      }

      // Parse filters from query parameters
      const filters: SearchFilters = {};
      
      // Add category IDs if present
      if (req.query.category) {
        filters.categoryIds = Array.isArray(req.query.category) 
          ? req.query.category as string[]
          : [req.query.category as string];
      }
      
      // Add tag IDs if present
      if (req.query.tag) {
        filters.tagIds = Array.isArray(req.query.tag)
          ? req.query.tag as string[]
          : [req.query.tag as string];
      }
      
      // Add author ID if present
      if (req.query.author) {
        filters.authorId = req.query.author as string;
      }
      
      // Add status if present
      if (req.query.status) {
        filters.status = req.query.status as 'draft' | 'published' | 'archived';
      }
      
      // Add date range if present
      if (req.query.from) {
        filters.dateFrom = new Date(req.query.from as string);
      }
      
      if (req.query.to) {
        filters.dateTo = new Date(req.query.to as string);
      }

      // Perform search
      const results = await this.searchService.searchArticles(query, filters);

      // Return search results
      res.json({
        query,
        count: results.length,
        results: results.map(result => ({
          id: result.article.id,
          title: result.article.title,
          excerpt: result.article.excerpt,
          authorId: result.article.authorId,
          publishedAt: result.article.publishedAt,
          relevanceScore: result.relevanceScore,
          matchedFields: result.matchedFields
        }))
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        error: {
          code: 'SEARCH_ERROR',
          message: 'An error occurred while searching'
        }
      });
    }
  }

  /**
   * Get search suggestions based on partial query
   * GET /search/suggestions?q=partial
   */
  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const partialQuery = req.query.q as string;
      
      if (!partialQuery || !partialQuery.trim()) {
        res.status(400).json({
          error: {
            code: 'INVALID_QUERY',
            message: 'Query parameter cannot be empty'
          }
        });
        return;
      }

      // Get suggestions
      const suggestions = await this.searchService.getSuggestions(partialQuery);

      // Return suggestions
      res.json({
        query: partialQuery,
        suggestions
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'An error occurred while getting suggestions'
        }
      });
    }
  }
}