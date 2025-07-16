import { Request, Response } from 'express';
import { SearchController } from '../SearchController';
import { SearchService } from '../../services';
import { Article } from '../../models';

// Mock the SearchService
const mockSearchService: jest.Mocked<SearchService> = {
  searchArticles: jest.fn(),
  indexArticle: jest.fn(),
  removeFromIndex: jest.fn(),
  getSuggestions: jest.fn()
};

// Mock request and response
const mockRequest = () => {
  return {
    query: {},
    params: {},
    body: {}
  } as unknown as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('SearchController', () => {
  let controller: SearchController;
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SearchController(mockSearchService);
    req = mockRequest();
    res = mockResponse();
  });

  describe('search', () => {
    it('should return 400 for empty query', async () => {
      req.query = { q: '' };
      
      await controller.search(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_QUERY'
        })
      }));
      expect(mockSearchService.searchArticles).not.toHaveBeenCalled();
    });

    it('should return search results for valid query', async () => {
      const mockArticle: Article = {
        id: '123',
        title: 'Test Article',
        content: 'Test content',
        excerpt: 'Test excerpt',
        authorId: '456',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        categoryIds: [],
        tagIds: []
      };

      mockSearchService.searchArticles.mockResolvedValue([
        {
          article: mockArticle,
          relevanceScore: 0.8,
          matchedFields: ['title', 'content']
        }
      ]);

      req.query = { q: 'test query' };
      
      await controller.search(req, res);
      
      expect(mockSearchService.searchArticles).toHaveBeenCalledWith('test query', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test query',
        count: 1,
        results: expect.arrayContaining([
          expect.objectContaining({
            id: '123',
            title: 'Test Article',
            relevanceScore: 0.8
          })
        ])
      }));
    });

    it('should handle search filters', async () => {
      mockSearchService.searchArticles.mockResolvedValue([]);

      req.query = { 
        q: 'test',
        category: 'cat1',
        tag: 'tag1',
        author: 'user1',
        status: 'published',
        from: '2023-01-01',
        to: '2023-12-31'
      };
      
      await controller.search(req, res);
      
      expect(mockSearchService.searchArticles).toHaveBeenCalledWith('test', expect.objectContaining({
        categoryIds: ['cat1'],
        tagIds: ['tag1'],
        authorId: 'user1',
        status: 'published',
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date)
      }));
    });

    it('should handle multiple categories and tags', async () => {
      mockSearchService.searchArticles.mockResolvedValue([]);

      req.query = { 
        q: 'test',
        category: ['cat1', 'cat2'],
        tag: ['tag1', 'tag2']
      };
      
      await controller.search(req, res);
      
      expect(mockSearchService.searchArticles).toHaveBeenCalledWith('test', expect.objectContaining({
        categoryIds: ['cat1', 'cat2'],
        tagIds: ['tag1', 'tag2']
      }));
    });

    it('should handle errors', async () => {
      mockSearchService.searchArticles.mockRejectedValue(new Error('Test error'));

      req.query = { q: 'test' };
      
      await controller.search(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'SEARCH_ERROR'
        })
      }));
    });
  });

  describe('getSuggestions', () => {
    it('should return 400 for empty query', async () => {
      req.query = { q: '' };
      
      await controller.getSuggestions(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_QUERY'
        })
      }));
      expect(mockSearchService.getSuggestions).not.toHaveBeenCalled();
    });

    it('should return suggestions for valid query', async () => {
      mockSearchService.getSuggestions.mockResolvedValue(['test', 'testing', 'tester']);

      req.query = { q: 'test' };
      
      await controller.getSuggestions(req, res);
      
      expect(mockSearchService.getSuggestions).toHaveBeenCalledWith('test');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test',
        suggestions: ['test', 'testing', 'tester']
      }));
    });

    it('should handle errors', async () => {
      mockSearchService.getSuggestions.mockRejectedValue(new Error('Test error'));

      req.query = { q: 'test' };
      
      await controller.getSuggestions(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.objectContaining({
          code: 'SUGGESTIONS_ERROR'
        })
      }));
    });
  });
});