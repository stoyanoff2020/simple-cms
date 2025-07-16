// Article controller integration tests
import request from 'supertest';
import express from 'express';
import { ArticleController } from '../ArticleController';
import { articleService } from '../../services/ArticleService';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import jwt from 'jsonwebtoken';

// Mock the article service
jest.mock('../../services/ArticleService', () => ({
  articleService: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getById: jest.fn(),
    getByAuthor: jest.fn(),
    getByAuthorPublished: jest.fn(),
    getPublished: jest.fn(),
    getAll: jest.fn(),
    getAllWithStatus: jest.fn(),
    getByCategory: jest.fn(),
    getByTag: jest.fn(),
    publish: jest.fn(),
    unpublish: jest.fn(),
    archive: jest.fn(),
    saveDraft: jest.fn()
  }
}));
jest.mock('../../database/connection');

// Create test app
const app = express();
app.use(express.json());

// Add routes with authentication middleware
// Note: Order matters - more specific routes should come before generic ones
app.get('/articles/author/:authorId', optionalAuth, ArticleController.getByAuthor);
app.get('/articles', optionalAuth, ArticleController.getAll);
app.post('/articles', authenticateToken, ArticleController.create);
app.put('/articles/:id/publish', authenticateToken, ArticleController.publish);
app.put('/articles/:id/unpublish', authenticateToken, ArticleController.unpublish);
app.put('/articles/:id/archive', authenticateToken, ArticleController.archive);
app.get('/articles/:id', optionalAuth, ArticleController.getById);
app.put('/articles/:id', authenticateToken, ArticleController.update);
app.delete('/articles/:id', authenticateToken, ArticleController.delete);

// Helper function to create JWT token for testing
const createTestToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
};

describe('ArticleController Integration Tests', () => {
  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    role: 'author'
  };

  const mockArticle = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    title: 'Test Article',
    content: 'This is test content',
    excerpt: 'Test excerpt',
    authorId: mockUser.userId,
    status: 'draft' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    publishedAt: undefined,
    categoryIds: [],
    tagIds: []
  };

  const validToken = createTestToken(mockUser);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /articles', () => {
    it('should create a new article successfully', async () => {
      const mockCreatedArticle = { ...mockArticle };
      (articleService.create as jest.Mock).mockResolvedValue(mockCreatedArticle);

      const response = await request(app)
        .post('/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Test Article',
          content: 'This is test content',
          excerpt: 'Test excerpt',
          status: 'draft',
          categoryIds: [],
          tagIds: []
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        ...mockCreatedArticle,
        createdAt: mockCreatedArticle.createdAt.toISOString(),
        updatedAt: mockCreatedArticle.updatedAt.toISOString()
      });
      expect(response.body.message).toBe('Article created successfully');
      expect(articleService.create).toHaveBeenCalledWith(
        {
          title: 'Test Article',
          content: 'This is test content',
          excerpt: 'Test excerpt',
          status: 'draft',
          categoryIds: [],
          tagIds: []
        },
        mockUser.userId
      );
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .post('/articles')
        .send({
          title: 'Test Article',
          content: 'This is test content'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 400 for validation errors', async () => {
      (articleService.create as jest.Mock).mockRejectedValue(new Error('Article title is required'));

      const response = await request(app)
        .post('/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          content: 'This is test content'
          // Missing title
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Article title is required');
    });

    it('should handle service errors gracefully', async () => {
      (articleService.create as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Test Article',
          content: 'This is test content'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to create article');
    });

    it('should create article with default status as draft', async () => {
      const mockCreatedArticle = { ...mockArticle };
      (articleService.create as jest.Mock).mockResolvedValue(mockCreatedArticle);

      const response = await request(app)
        .post('/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Test Article',
          content: 'This is test content'
          // No status provided, should default to 'draft'
        });

      expect(response.status).toBe(201);
      expect(articleService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft'
        }),
        mockUser.userId
      );
    });
  });

  describe('GET /articles/:id', () => {
    it('should get published article successfully (public access)', async () => {
      const publishedArticle = {
        ...mockArticle,
        status: 'published' as const,
        publishedAt: new Date('2024-01-01T12:00:00Z')
      };
      (articleService.getById as jest.Mock).mockResolvedValue(publishedArticle);

      const response = await request(app)
        .get(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        ...publishedArticle,
        createdAt: publishedArticle.createdAt.toISOString(),
        updatedAt: publishedArticle.updatedAt.toISOString(),
        publishedAt: publishedArticle.publishedAt.toISOString()
      });
    });

    it('should get draft article when user is the author', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);

      const response = await request(app)
        .get(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockArticle.id);
    });

    it('should return 403 when trying to access draft article of another user', async () => {
      const otherUserArticle = {
        ...mockArticle,
        authorId: 'different-user-id'
      };
      (articleService.getById as jest.Mock).mockResolvedValue(otherUserArticle);

      const response = await request(app)
        .get(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Access denied to this article');
    });

    it('should return 404 when article not found', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/articles/nonexistent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Article not found');
    });

    it('should return 400 when article ID is invalid', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/articles/invalid-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Article not found');
    });

    it('should return 403 when trying to access draft article without authentication', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);

      const response = await request(app)
        .get(`/articles/${mockArticle.id}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('Access denied to this article');
    });
  });

  describe('PUT /articles/:id', () => {
    it('should update article successfully when user is the author', async () => {
      const updatedArticle = {
        ...mockArticle,
        title: 'Updated Title',
        content: 'Updated content'
      };

      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.update as jest.Mock).mockResolvedValue(updatedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Updated Title',
          content: 'Updated content'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.content).toBe('Updated content');
      expect(response.body.message).toBe('Article updated successfully');
      expect(articleService.update).toHaveBeenCalledWith(
        mockArticle.id,
        {
          title: 'Updated Title',
          content: 'Updated content'
        }
      );
    });

    it('should return 403 when trying to update another user\'s article', async () => {
      const otherUserArticle = {
        ...mockArticle,
        authorId: 'different-user-id'
      };
      (articleService.getById as jest.Mock).mockResolvedValue(otherUserArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('You can only update your own articles');
    });

    it('should return 404 when article not found', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/articles/nonexistent-id')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Article not found');
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .put(`/articles/${mockArticle.id}`)
        .send({
          title: 'Updated Title'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should handle validation errors', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.update as jest.Mock).mockRejectedValue(new Error('Article title cannot be empty'));

      const response = await request(app)
        .put(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Article title cannot be empty');
    });

    it('should update only provided fields', async () => {
      const updatedArticle = {
        ...mockArticle,
        title: 'Updated Title'
      };

      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.update as jest.Mock).mockResolvedValue(updatedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Updated Title'
          // Only updating title, not content
        });

      expect(response.status).toBe(200);
      expect(articleService.update).toHaveBeenCalledWith(
        mockArticle.id,
        {
          title: 'Updated Title'
        }
      );
    });
  });

  describe('DELETE /articles/:id', () => {
    it('should delete article successfully when user is the author', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Article deleted successfully');
      expect(articleService.delete).toHaveBeenCalledWith(mockArticle.id);
    });

    it('should return 403 when trying to delete another user\'s article', async () => {
      const otherUserArticle = {
        ...mockArticle,
        authorId: 'different-user-id'
      };
      (articleService.getById as jest.Mock).mockResolvedValue(otherUserArticle);

      const response = await request(app)
        .delete(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('You can only delete your own articles');
    });

    it('should return 404 when article not found', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/articles/nonexistent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Article not found');
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .delete(`/articles/${mockArticle.id}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should handle service errors gracefully', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.delete as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .delete(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to delete article');
    });

    it('should return 400 when article ID is missing', async () => {
      const response = await request(app)
        .delete('/articles/')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404); // Express returns 404 for missing route params
    });
  });

  describe('GET /articles', () => {
    const mockPaginatedResult = {
      data: [
        {
          ...mockArticle,
          status: 'published' as const,
          publishedAt: new Date('2024-01-01T12:00:00Z')
        },
        {
          ...mockArticle,
          id: 'article-2',
          title: 'Second Article',
          status: 'published' as const,
          publishedAt: new Date('2024-01-02T12:00:00Z')
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      }
    };

    it('should get all published articles with default pagination', async () => {
      (articleService.getPublished as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get('/articles');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual(mockPaginatedResult.pagination);
      expect(articleService.getPublished).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should get all articles when authenticated user requests without status filter', async () => {
      (articleService.getAll as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get('/articles')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(articleService.getAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should get articles with custom pagination parameters', async () => {
      (articleService.getPublished as jest.Mock).mockResolvedValue({
        ...mockPaginatedResult,
        pagination: { page: 2, limit: 5, total: 2, totalPages: 1 }
      });

      const response = await request(app)
        .get('/articles?page=2&limit=5&sortBy=title&sortOrder=asc');

      expect(response.status).toBe(200);
      expect(articleService.getPublished).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        sortBy: 'title',
        sortOrder: 'asc'
      });
    });

    it('should filter articles by status (published)', async () => {
      (articleService.getPublished as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get('/articles?status=published');

      expect(response.status).toBe(200);
      expect(articleService.getPublished).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should filter articles by category', async () => {
      const categoryId = 'category-123';
      (articleService.getByCategory as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get(`/articles?categoryId=${categoryId}`);

      expect(response.status).toBe(200);
      expect(articleService.getByCategory).toHaveBeenCalledWith(categoryId, {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should filter articles by tag', async () => {
      const tagId = 'tag-123';
      (articleService.getByTag as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get(`/articles?tagId=${tagId}`);

      expect(response.status).toBe(200);
      expect(articleService.getByTag).toHaveBeenCalledWith(tagId, {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should require authentication for non-published status filters', async () => {
      const response = await request(app)
        .get('/articles?status=draft');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body.error.message).toBe('Authentication required to view non-published articles');
    });

    it('should get draft articles when authenticated user requests them', async () => {
      (articleService.getAllWithStatus as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get('/articles?status=draft')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(articleService.getAllWithStatus).toHaveBeenCalledWith('draft', {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/articles?page=0&limit=101');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100');
    });

    it('should return 400 for invalid sortBy field', async () => {
      const response = await request(app)
        .get('/articles?sortBy=invalid_field');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid sortBy field. Must be one of: created_at, updated_at, published_at, title');
    });

    it('should return 400 for invalid sortOrder', async () => {
      const response = await request(app)
        .get('/articles?sortOrder=invalid');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid sortOrder. Must be "asc" or "desc"');
    });

    it('should handle service errors gracefully', async () => {
      (articleService.getPublished as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/articles');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to retrieve articles');
    });
  });

  describe('GET /articles/author/:authorId', () => {
    const authorId = 'author-123';
    const mockAuthorArticles = {
      data: [
        {
          ...mockArticle,
          authorId,
          status: 'published' as const,
          publishedAt: new Date('2024-01-01T12:00:00Z')
        }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    };

    it('should get published articles by author for unauthenticated users', async () => {
      (articleService.getByAuthorPublished as jest.Mock).mockResolvedValue(mockAuthorArticles);

      const response = await request(app)
        .get(`/articles/author/${authorId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual(mockAuthorArticles.pagination);
      expect(articleService.getByAuthorPublished).toHaveBeenCalledWith(authorId, {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should get all articles by author when user views their own articles', async () => {
      (articleService.getByAuthor as jest.Mock).mockResolvedValue(mockAuthorArticles);

      const response = await request(app)
        .get(`/articles/author/${mockUser.userId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(articleService.getByAuthor).toHaveBeenCalledWith(mockUser.userId, {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should get published articles by author when authenticated user views another author', async () => {
      const otherAuthorId = 'other-author-123';
      (articleService.getByAuthorPublished as jest.Mock).mockResolvedValue(mockAuthorArticles);

      const response = await request(app)
        .get(`/articles/author/${otherAuthorId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(articleService.getByAuthorPublished).toHaveBeenCalledWith(otherAuthorId, {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should get articles with custom pagination parameters', async () => {
      (articleService.getByAuthorPublished as jest.Mock).mockResolvedValue({
        ...mockAuthorArticles,
        pagination: { page: 2, limit: 5, total: 1, totalPages: 1 }
      });

      const response = await request(app)
        .get(`/articles/author/${authorId}?page=2&limit=5&sortBy=title&sortOrder=asc`);

      expect(response.status).toBe(200);
      expect(articleService.getByAuthorPublished).toHaveBeenCalledWith(authorId, {
        page: 2,
        limit: 5,
        sortBy: 'title',
        sortOrder: 'asc'
      });
    });

    it('should handle invalid author ID gracefully', async () => {
      const invalidAuthorId = 'invalid-author-id';
      (articleService.getByAuthorPublished as jest.Mock).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });

      const response = await request(app)
        .get(`/articles/author/${invalidAuthorId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get(`/articles/author/${authorId}?page=0&limit=101`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100');
    });

    it('should return 400 for invalid sortBy field', async () => {
      const response = await request(app)
        .get(`/articles/author/${authorId}?sortBy=invalid_field`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid sortBy field. Must be one of: created_at, updated_at, published_at, title');
    });

    it('should return 400 for invalid sortOrder', async () => {
      const response = await request(app)
        .get(`/articles/author/${authorId}?sortOrder=invalid`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid sortOrder. Must be "asc" or "desc"');
    });

    it('should handle service errors gracefully', async () => {
      (articleService.getByAuthorPublished as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/articles/author/${authorId}`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to retrieve articles by author');
    });
  });

  describe('PUT /articles/:id/publish', () => {
    it('should publish a draft article successfully', async () => {
      const publishedArticle = {
        ...mockArticle,
        status: 'published' as const,
        publishedAt: new Date('2024-01-01T12:00:00Z')
      };

      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.publish as jest.Mock).mockResolvedValue(publishedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/publish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.publishedAt).toBeDefined();
      expect(response.body.message).toBe('Article published successfully');
      expect(articleService.publish).toHaveBeenCalledWith(mockArticle.id);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .put(`/articles/${mockArticle.id}/publish`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 404 when article not found', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/articles/nonexistent-id/publish')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Article not found');
    });

    it('should return 403 when trying to publish another user\'s article', async () => {
      const otherUserArticle = {
        ...mockArticle,
        authorId: 'different-user-id'
      };
      (articleService.getById as jest.Mock).mockResolvedValue(otherUserArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/publish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('You can only publish your own articles');
    });

    it('should return 400 when article is already published', async () => {
      const publishedArticle = {
        ...mockArticle,
        status: 'published' as const,
        publishedAt: new Date('2024-01-01T12:00:00Z')
      };

      (articleService.getById as jest.Mock).mockResolvedValue(publishedArticle);
      (articleService.publish as jest.Mock).mockRejectedValue(new Error('Article is already published'));

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/publish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Article is already published');
    });

    it('should return 400 when article cannot be published due to missing content', async () => {
      const incompleteArticle = {
        ...mockArticle,
        title: '',
        content: '',
        authorId: mockUser.userId // Ensure the article belongs to the authenticated user
      };

      (articleService.getById as jest.Mock).mockResolvedValue(incompleteArticle);
      (articleService.publish as jest.Mock).mockRejectedValue(new Error('Cannot publish article without a title'));

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/publish`)
        .set('Authorization', `Bearer ${validToken}`);

      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Cannot publish article without a title');
    });

    it('should handle service errors gracefully', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.publish as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/publish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to publish article');
    });
  });

  describe('PUT /articles/:id/unpublish', () => {
    const publishedArticle = {
      ...mockArticle,
      status: 'published' as const,
      publishedAt: new Date('2024-01-01T12:00:00Z')
    };

    it('should unpublish a published article successfully', async () => {
      const unpublishedArticle = {
        ...publishedArticle,
        status: 'draft' as const,
        publishedAt: undefined
      };

      (articleService.getById as jest.Mock).mockResolvedValue(publishedArticle);
      (articleService.unpublish as jest.Mock).mockResolvedValue(unpublishedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/unpublish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('draft');
      expect(response.body.data.publishedAt).toBeUndefined();
      expect(response.body.message).toBe('Article unpublished successfully');
      expect(articleService.unpublish).toHaveBeenCalledWith(mockArticle.id);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .put(`/articles/${mockArticle.id}/unpublish`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 404 when article not found', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/articles/nonexistent-id/unpublish')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Article not found');
    });

    it('should return 403 when trying to unpublish another user\'s article', async () => {
      const otherUserArticle = {
        ...publishedArticle,
        authorId: 'different-user-id'
      };
      (articleService.getById as jest.Mock).mockResolvedValue(otherUserArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/unpublish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('You can only unpublish your own articles');
    });

    it('should return 400 when article is not published', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.unpublish as jest.Mock).mockRejectedValue(new Error('Article is not published'));

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/unpublish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Article is not published');
    });

    it('should handle service errors gracefully', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(publishedArticle);
      (articleService.unpublish as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/unpublish`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to unpublish article');
    });
  });

  describe('PUT /articles/:id/archive', () => {
    it('should archive a draft article successfully', async () => {
      const archivedArticle = {
        ...mockArticle,
        status: 'archived' as const
      };

      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.archive as jest.Mock).mockResolvedValue(archivedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/archive`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
      expect(response.body.message).toBe('Article archived successfully');
      expect(articleService.archive).toHaveBeenCalledWith(mockArticle.id);
    });

    it('should archive a published article successfully', async () => {
      const publishedArticle = {
        ...mockArticle,
        status: 'published' as const,
        publishedAt: new Date('2024-01-01T12:00:00Z')
      };

      const archivedArticle = {
        ...publishedArticle,
        status: 'archived' as const,
        publishedAt: undefined
      };

      (articleService.getById as jest.Mock).mockResolvedValue(publishedArticle);
      (articleService.archive as jest.Mock).mockResolvedValue(archivedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/archive`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
      expect(response.body.message).toBe('Article archived successfully');
      expect(articleService.archive).toHaveBeenCalledWith(mockArticle.id);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .put(`/articles/${mockArticle.id}/archive`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 404 when article not found', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/articles/nonexistent-id/archive')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Article not found');
    });

    it('should return 403 when trying to archive another user\'s article', async () => {
      const otherUserArticle = {
        ...mockArticle,
        authorId: 'different-user-id'
      };
      (articleService.getById as jest.Mock).mockResolvedValue(otherUserArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/archive`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toBe('You can only archive your own articles');
    });

    it('should handle service errors gracefully', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.archive as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .put(`/articles/${mockArticle.id}/archive`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Failed to archive article');
    });
  });
});