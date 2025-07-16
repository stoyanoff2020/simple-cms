// Tag controller integration tests
import request from 'supertest';
import express from 'express';
import { tagController } from '../TagController';
import { tagService } from '../../services/TagService';
import { authenticateToken } from '../../middleware/auth';
import jwt from 'jsonwebtoken';

// Mock the tag service
jest.mock('../../services/TagService', () => ({
  tagService: {
    createOrGet: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    getArticlesByTag: jest.fn(),
    cleanupUnusedTags: jest.fn(),
    searchByName: jest.fn(),
    getPopular: jest.fn()
  }
}));
jest.mock('../../database/connection');

// Create test app
const app = express();
app.use(express.json());

// Add routes with authentication middleware
app.post('/tags', authenticateToken, tagController.createOrGet.bind(tagController));
app.get('/tags', tagController.getAll.bind(tagController));
app.get('/tags/popular', tagController.getPopular.bind(tagController));
app.get('/tags/search', tagController.searchByName.bind(tagController));
app.delete('/tags/cleanup', authenticateToken, tagController.cleanupUnusedTags.bind(tagController));
app.get('/tags/:id', tagController.getById.bind(tagController));
app.get('/tags/:id/articles', tagController.getArticlesByTag.bind(tagController));

// Helper function to create JWT token for testing
const createTestToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
};

describe('TagController Integration Tests', () => {
  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin'
  };

  const mockTag = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    name: 'javascript',
    slug: 'javascript',
    usageCount: 5,
    createdAt: new Date('2024-01-01T00:00:00Z')
  };

  const validToken = createTestToken(mockUser);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /tags', () => {
    it('should create a new tag successfully', async () => {
      (tagService.createOrGet as jest.Mock).mockResolvedValue(mockTag);

      const response = await request(app)
        .post('/tags')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'javascript'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        ...mockTag,
        createdAt: mockTag.createdAt.toISOString()
      });
      expect(tagService.createOrGet).toHaveBeenCalledWith('javascript');
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .post('/tags')
        .send({
          name: 'javascript'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when tag name is missing', async () => {
      const response = await request(app)
        .post('/tags')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Tag name is required');
    });

    it('should return 500 on server error', async () => {
      (tagService.createOrGet as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/tags')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'javascript'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create tag');
    });
  });

  describe('GET /tags', () => {
    it('should get all tags successfully', async () => {
      const mockTags = [mockTag, { ...mockTag, id: '789', name: 'typescript', slug: 'typescript' }];
      (tagService.getAll as jest.Mock).mockResolvedValue(mockTags);

      const response = await request(app)
        .get('/tags');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTags.map(tag => ({
        ...tag,
        createdAt: tag.createdAt.toISOString()
      })));
      expect(tagService.getAll).toHaveBeenCalled();
    });

    it('should return 500 on server error', async () => {
      (tagService.getAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/tags');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve tags');
    });
  });

  describe('GET /tags/:id', () => {
    it('should get a tag by ID successfully', async () => {
      (tagService.getById as jest.Mock).mockResolvedValue(mockTag);

      const response = await request(app)
        .get(`/tags/${mockTag.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockTag,
        createdAt: mockTag.createdAt.toISOString()
      });
      expect(tagService.getById).toHaveBeenCalledWith(mockTag.id);
    });

    it('should return 404 when tag not found', async () => {
      (tagService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/tags/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tag not found');
    });

    it('should return 500 on server error', async () => {
      (tagService.getById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/tags/${mockTag.id}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve tag');
    });
  });

  describe('GET /tags/:id/articles', () => {
    it('should get articles by tag successfully', async () => {
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article',
          content: 'Test content',
          excerpt: 'Test excerpt',
          authorId: 'author-1',
          status: 'published',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          publishedAt: new Date('2024-01-01T00:00:00Z'),
          categoryIds: [],
          tagIds: [mockTag.id]
        }
      ];
      (tagService.getArticlesByTag as jest.Mock).mockResolvedValue(mockArticles);

      const response = await request(app)
        .get(`/tags/${mockTag.id}/articles`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockArticles.map(article => ({
        ...article,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        publishedAt: article.publishedAt.toISOString()
      })));
      expect(tagService.getArticlesByTag).toHaveBeenCalledWith(mockTag.id);
    });

    it('should return 404 when tag not found', async () => {
      (tagService.getArticlesByTag as jest.Mock).mockRejectedValue(
        new Error(`Tag with id 'nonexistent-id' not found`)
      );

      const response = await request(app)
        .get('/tags/nonexistent-id/articles');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(`Tag with id 'nonexistent-id' not found`);
    });

    it('should return 500 on server error', async () => {
      (tagService.getArticlesByTag as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/tags/${mockTag.id}/articles`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve articles for tag');
    });
  });

  describe('DELETE /tags/cleanup', () => {
    it('should clean up unused tags successfully', async () => {
      (tagService.cleanupUnusedTags as jest.Mock).mockResolvedValue(3);

      const response = await request(app)
        .delete('/tags/cleanup')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully removed 3 unused tags');
      expect(response.body.deletedCount).toBe(3);
      expect(tagService.cleanupUnusedTags).toHaveBeenCalled();
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .delete('/tags/cleanup');

      expect(response.status).toBe(401);
    });

    it('should return 500 on server error', async () => {
      (tagService.cleanupUnusedTags as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/tags/cleanup')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to clean up unused tags');
    });
  });

  describe('GET /tags/search', () => {
    it('should search tags by name successfully', async () => {
      const mockTags = [mockTag];
      (tagService.searchByName as jest.Mock).mockResolvedValue(mockTags);

      const response = await request(app)
        .get('/tags/search?q=java');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTags.map(tag => ({
        ...tag,
        createdAt: tag.createdAt.toISOString()
      })));
      expect(tagService.searchByName).toHaveBeenCalledWith('java', 10);
    });

    it('should search with custom limit', async () => {
      const mockTags = [mockTag];
      (tagService.searchByName as jest.Mock).mockResolvedValue(mockTags);

      const response = await request(app)
        .get('/tags/search?q=java&limit=5');

      expect(response.status).toBe(200);
      expect(tagService.searchByName).toHaveBeenCalledWith('java', 5);
    });

    it('should return 400 when search term is missing', async () => {
      const response = await request(app)
        .get('/tags/search');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Search term is required');
    });

    it('should return 500 on server error', async () => {
      (tagService.searchByName as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/tags/search?q=java');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to search tags');
    });
  });

  describe('GET /tags/popular', () => {
    it('should get popular tags successfully', async () => {
      const mockTags = [mockTag];
      (tagService.getPopular as jest.Mock).mockResolvedValue(mockTags);

      const response = await request(app)
        .get('/tags/popular');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTags.map(tag => ({
        ...tag,
        createdAt: tag.createdAt.toISOString()
      })));
      expect(tagService.getPopular).toHaveBeenCalledWith(10);
    });

    it('should get popular tags with custom limit', async () => {
      const mockTags = [mockTag];
      (tagService.getPopular as jest.Mock).mockResolvedValue(mockTags);

      const response = await request(app)
        .get('/tags/popular?limit=5');

      expect(response.status).toBe(200);
      expect(tagService.getPopular).toHaveBeenCalledWith(5);
    });

    it('should return 500 on server error', async () => {
      (tagService.getPopular as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/tags/popular');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve popular tags');
    });
  });
});