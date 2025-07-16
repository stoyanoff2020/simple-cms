import { Pool } from 'pg';
import { PostgresSearchService } from '../implementations/SearchService';
import { Article } from '../../models';

// Mock the pg Pool
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const MockPool = jest.fn(() => ({
    query: mockQuery,
  }));
  return { Pool: MockPool };
});

describe('PostgresSearchService', () => {
  let searchService: PostgresSearchService;
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = { query: jest.fn() };
    searchService = new PostgresSearchService(mockPool as unknown as Pool);
  });

  describe('searchArticles', () => {
    it('should throw an error for empty query', async () => {
      await expect(searchService.searchArticles('')).rejects.toThrow('Search query cannot be empty');
    });

    it('should execute search query with proper parameters', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: '123',
            title: 'Test Article',
            content: 'Test content',
            excerpt: 'Test excerpt',
            author_id: '456',
            status: 'published',
            created_at: new Date(),
            updated_at: new Date(),
            published_at: new Date(),
            relevance_score: '0.8',
            matched_fields: ['title', 'content']
          }
        ]
      });

      const results = await searchService.searchArticles('test query');
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.query.mock.calls[0][0]).toContain('to_tsquery');
      expect(mockPool.query.mock.calls[0][1][0]).toBe('test:* & query:*');
      
      expect(results).toHaveLength(1);
      expect(results[0].article.title).toBe('Test Article');
      expect(results[0].relevanceScore).toBe(0.8);
      expect(results[0].matchedFields).toEqual(['title', 'content']);
    });

    it('should apply filters when provided', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await searchService.searchArticles('test', {
        status: 'published',
        authorId: '123',
        categoryIds: ['cat1', 'cat2'],
        tagIds: ['tag1']
      });

      const sqlQuery = mockPool.query.mock.calls[0][0];
      const params = mockPool.query.mock.calls[0][1];

      expect(sqlQuery).toContain('status = $2');
      expect(sqlQuery).toContain('author_id = $3');
      expect(sqlQuery).toContain('category_id IN ($4,$5)');
      expect(sqlQuery).toContain('tag_id IN ($6)');
      
      expect(params).toEqual(['test:*', 'published', '123', 'cat1', 'cat2', 'tag1']);
    });
  });

  describe('indexArticle', () => {
    it('should update search vector for an article', async () => {
      const article: Article = {
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

      await searchService.indexArticle(article);

      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.query.mock.calls[0][0]).toContain('UPDATE articles');
      expect(mockPool.query.mock.calls[0][0]).toContain('SET search_vector');
      expect(mockPool.query.mock.calls[0][1]).toEqual([
        'Test Article',
        'Test content',
        'Test excerpt',
        '123'
      ]);
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for empty query', async () => {
      const suggestions = await searchService.getSuggestions('');
      expect(suggestions).toEqual([]);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should query for suggestions based on partial query', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { word: 'testing' },
          { word: 'test' }
        ]
      });

      const suggestions = await searchService.getSuggestions('test');
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockPool.query.mock.calls[0][0]).toContain('ts_stat');
      expect(mockPool.query.mock.calls[0][1]).toEqual(['test%']);
      
      expect(suggestions).toEqual(['testing', 'test']);
    });
  });
});