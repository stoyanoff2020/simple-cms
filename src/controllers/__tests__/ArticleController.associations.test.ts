// Article controller associations integration tests
import request from 'supertest';
import express from 'express';
import { ArticleController } from '../ArticleController';
import { articleService } from '../../services/ArticleService';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import jwt from 'jsonwebtoken';

// Mock the services
jest.mock('../../services/ArticleService', () => ({
  articleService: {
    create: jest.fn(),
    update: jest.fn(),
    getById: jest.fn(),
    getByCategory: jest.fn(),
    getByTag: jest.fn()
  }
}));

jest.mock('../../services/CategoryService', () => ({
  categoryService: {
    getById: jest.fn(),
    getArticlesByCategory: jest.fn()
  }
}));

jest.mock('../../services/TagService', () => ({
  tagService: {
    getById: jest.fn(),
    getArticlesByTag: jest.fn(),
    createOrGet: jest.fn()
  }
}));

jest.mock('../../database/connection');

// Create test app
const app = express();
app.use(express.json());

// Add routes with authentication middleware
app.get('/articles', optionalAuth, ArticleController.getAll);
app.post('/articles', authenticateToken, ArticleController.create);
app.get('/articles/:id', optionalAuth, ArticleController.getById);
app.put('/articles/:id', authenticateToken, ArticleController.update);

// Helper function to create JWT token for testing
const createTestToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
};

describe('ArticleController Associations Integration Tests', () => {
  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    role: 'author'
  };

  const mockCategory = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    name: 'Test Category',
    description: 'This is a test category',
    slug: 'test-category',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  const mockTag = {
    id: '789e0123-e89b-12d3-a456-426614174002',
    name: 'javascript',
    slug: 'javascript',
    usageCount: 5,
    createdAt: new Date('2024-01-01T00:00:00Z')
  };

  const mockArticle = {
    id: '012e3456-e89b-12d3-a456-426614174003',
    title: 'Test Article',
    content: 'This is test content',
    excerpt: 'Test excerpt',
    authorId: mockUser.userId,
    status: 'published' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    publishedAt: new Date('2024-01-01T00:00:00Z'),
    categoryIds: [mockCategory.id],
    tagIds: [mockTag.id]
  };

  const validToken = createTestToken(mockUser);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /articles with categories and tags', () => {
    it('should create an article with category and tag associations', async () => {
      (articleService.create as jest.Mock).mockResolvedValue(mockArticle);

      const response = await request(app)
        .post('/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Test Article',
          content: 'This is test content',
          excerpt: 'Test excerpt',
          status: 'published',
          categoryIds: [mockCategory.id],
          tagIds: [mockTag.id]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.categoryIds).toEqual([mockCategory.id]);
      expect(response.body.data.tagIds).toEqual([mockTag.id]);
      expect(articleService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryIds: [mockCategory.id],
          tagIds: [mockTag.id]
        }),
        mockUser.userId
      );
    });

    it('should create an article with empty category and tag arrays', async () => {
      const articleWithoutAssociations = {
        ...mockArticle,
        categoryIds: [],
        tagIds: []
      };
      (articleService.create as jest.Mock).mockResolvedValue(articleWithoutAssociations);

      const response = await request(app)
        .post('/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Test Article',
          content: 'This is test content',
          excerpt: 'Test excerpt',
          status: 'published',
          categoryIds: [],
          tagIds: []
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.categoryIds).toEqual([]);
      expect(response.body.data.tagIds).toEqual([]);
      expect(articleService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryIds: [],
          tagIds: []
        }),
        mockUser.userId
      );
    });
  });

  describe('PUT /articles/:id with categories and tags', () => {
    it('should update article category and tag associations', async () => {
      const updatedArticle = {
        ...mockArticle,
        categoryIds: ['new-category-id'],
        tagIds: ['new-tag-id', 'another-tag-id']
      };

      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.update as jest.Mock).mockResolvedValue(updatedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          categoryIds: ['new-category-id'],
          tagIds: ['new-tag-id', 'another-tag-id']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.categoryIds).toEqual(['new-category-id']);
      expect(response.body.data.tagIds).toEqual(['new-tag-id', 'another-tag-id']);
      expect(articleService.update).toHaveBeenCalledWith(
        mockArticle.id,
        expect.objectContaining({
          categoryIds: ['new-category-id'],
          tagIds: ['new-tag-id', 'another-tag-id']
        })
      );
    });

    it('should clear category and tag associations', async () => {
      const updatedArticle = {
        ...mockArticle,
        categoryIds: [],
        tagIds: []
      };

      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
      (articleService.update as jest.Mock).mockResolvedValue(updatedArticle);

      const response = await request(app)
        .put(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          categoryIds: [],
          tagIds: []
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.categoryIds).toEqual([]);
      expect(response.body.data.tagIds).toEqual([]);
      expect(articleService.update).toHaveBeenCalledWith(
        mockArticle.id,
        expect.objectContaining({
          categoryIds: [],
          tagIds: []
        })
      );
    });
  });

  describe('GET /articles with category and tag filtering', () => {
    const mockPaginatedResult = {
      data: [mockArticle],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      }
    };

    it('should filter articles by category', async () => {
      (articleService.getByCategory as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get(`/articles?categoryId=${mockCategory.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(articleService.getByCategory).toHaveBeenCalledWith(
        mockCategory.id,
        expect.objectContaining({
          page: 1,
          limit: 10
        })
      );
    });

    it('should filter articles by tag', async () => {
      (articleService.getByTag as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const response = await request(app)
        .get(`/articles?tagId=${mockTag.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(articleService.getByTag).toHaveBeenCalledWith(
        mockTag.id,
        expect.objectContaining({
          page: 1,
          limit: 10
        })
      );
    });
  });

  describe('GET /articles/:id with associations', () => {
    it('should return article with category and tag associations', async () => {
      (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);

      const response = await request(app)
        .get(`/articles/${mockArticle.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.categoryIds).toEqual([mockCategory.id]);
      expect(response.body.data.tagIds).toEqual([mockTag.id]);
    });
  });
});