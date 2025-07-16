import { publicArticleService } from '../PublicArticleService';
import { publicArticleRepository } from '../../repositories/PublicArticleRepository';

// Mock the publicArticleRepository
jest.mock('../../repositories/PublicArticleRepository', () => ({
  publicArticleRepository: {
    findPublished: jest.fn(),
    findPublishedById: jest.fn(),
    findRelatedArticles: jest.fn()
  }
}));

describe('PublicArticleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublishedArticles', () => {
    it('should return published articles with pagination', async () => {
      // Arrange
      const mockPaginationOptions = {
        page: 1,
        limit: 10,
        sortBy: 'published_at',
        sortOrder: 'desc' as 'asc' | 'desc'
      };
      
      const mockArticles = [
        { id: '1', title: 'Article 1', content: 'Content 1', status: 'published' },
        { id: '2', title: 'Article 2', content: 'Content 2', status: 'published' }
      ];
      
      const mockPagination = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      };
      
      (publicArticleRepository.findPublished as jest.Mock).mockResolvedValue({
        data: mockArticles,
        pagination: mockPagination
      });

      // Act
      const result = await publicArticleService.getPublishedArticles(mockPaginationOptions);

      // Assert
      expect(result.data).toEqual(mockArticles);
      expect(result.pagination).toEqual(mockPagination);
      expect(publicArticleRepository.findPublished).toHaveBeenCalledWith(mockPaginationOptions, undefined);
    });
    
    it('should handle date range filtering', async () => {
      // Arrange
      const mockPaginationOptions = {
        page: 1,
        limit: 10,
        sortBy: 'published_at',
        sortOrder: 'desc' as 'asc' | 'desc'
      };
      
      const mockDateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };
      
      const mockArticles = [
        { id: '1', title: 'Article 1', content: 'Content 1', status: 'published' }
      ];
      
      const mockPagination = {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      };
      
      (publicArticleRepository.findPublished as jest.Mock).mockResolvedValue({
        data: mockArticles,
        pagination: mockPagination
      });

      // Act
      const result = await publicArticleService.getPublishedArticles(mockPaginationOptions, mockDateRange);

      // Assert
      expect(result.data).toEqual(mockArticles);
      expect(result.pagination).toEqual(mockPagination);
      expect(publicArticleRepository.findPublished).toHaveBeenCalledWith(mockPaginationOptions, mockDateRange);
    });
  });

  describe('getPublishedArticleById', () => {
    it('should return a published article by ID', async () => {
      // Arrange
      const articleId = '1';
      const mockArticle = { 
        id: '1', 
        title: 'Article 1', 
        content: 'Content 1', 
        status: 'published' 
      };
      
      (publicArticleRepository.findPublishedById as jest.Mock).mockResolvedValue(mockArticle);

      // Act
      const result = await publicArticleService.getPublishedArticleById(articleId);

      // Assert
      expect(result).toEqual(mockArticle);
      expect(publicArticleRepository.findPublishedById).toHaveBeenCalledWith(articleId);
    });

    it('should return null if article not found', async () => {
      // Arrange
      const articleId = '999';
      (publicArticleRepository.findPublishedById as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await publicArticleService.getPublishedArticleById(articleId);

      // Assert
      expect(result).toBeNull();
      expect(publicArticleRepository.findPublishedById).toHaveBeenCalledWith(articleId);
    });

    it('should throw error if article ID is missing', async () => {
      // Act & Assert
      await expect(publicArticleService.getPublishedArticleById('')).rejects.toThrow('Article ID is required');
      expect(publicArticleRepository.findPublishedById).not.toHaveBeenCalled();
    });
  });

  describe('getRelatedArticles', () => {
    it('should return related articles', async () => {
      // Arrange
      const articleId = '1';
      const limit = 5;
      const mockRelatedArticles = [
        { id: '2', title: 'Related Article 1', content: 'Content 2', status: 'published' },
        { id: '3', title: 'Related Article 2', content: 'Content 3', status: 'published' }
      ];
      
      (publicArticleRepository.findRelatedArticles as jest.Mock).mockResolvedValue(mockRelatedArticles);

      // Act
      const result = await publicArticleService.getRelatedArticles(articleId, limit);

      // Assert
      expect(result).toEqual(mockRelatedArticles);
      expect(publicArticleRepository.findRelatedArticles).toHaveBeenCalledWith(articleId, limit);
    });

    it('should use default limit if not provided', async () => {
      // Arrange
      const articleId = '1';
      const mockRelatedArticles = [
        { id: '2', title: 'Related Article 1', content: 'Content 2', status: 'published' }
      ];
      
      (publicArticleRepository.findRelatedArticles as jest.Mock).mockResolvedValue(mockRelatedArticles);

      // Act
      const result = await publicArticleService.getRelatedArticles(articleId);

      // Assert
      expect(result).toEqual(mockRelatedArticles);
      expect(publicArticleRepository.findRelatedArticles).toHaveBeenCalledWith(articleId, 5); // Default limit
    });

    it('should throw error if article ID is missing', async () => {
      // Act & Assert
      await expect(publicArticleService.getRelatedArticles('')).rejects.toThrow('Article ID is required');
      expect(publicArticleRepository.findRelatedArticles).not.toHaveBeenCalled();
    });
  });
});