// Category controller integration tests
import request from 'supertest';
import express from 'express';
import { categoryController } from '../CategoryController';
import { categoryService } from '../../services/CategoryService';
import { authenticateToken } from '../../middleware/auth';
import jwt from 'jsonwebtoken';

// Mock the category service
jest.mock('../../services/CategoryService', () => ({
  categoryService: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    getArticlesByCategory: jest.fn()
  }
}));
jest.mock('../../database/connection');

// Create test app
const app = express();
app.use(express.json());

// Add routes with authentication middleware
app.post('/categories', authenticateToken, categoryController.create.bind(categoryController));
app.get('/categories', categoryController.getAll.bind(categoryController));
app.get('/categories/:id', categoryController.getById.bind(categoryController));
app.put('/categories/:id', authenticateToken, categoryController.update.bind(categoryController));
app.delete('/categories/:id', authenticateToken, categoryController.delete.bind(categoryController));
app.get('/categories/:id/articles', categoryController.getArticlesByCategory.bind(categoryController));

// Helper function to create JWT token for testing
const createTestToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
};

describe('CategoryController Integration Tests', () => {
  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin'
  };

  const mockCategory = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    name: 'Test Category',
    description: 'This is a test category',
    slug: 'test-category',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  const validToken = createTestToken(mockUser);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /categories', () => {
    it('should create a new category successfully', async () => {
      (categoryService.create as jest.Mock).mockResolvedValue(mockCategory);

      const response = await request(app)
        .post('/categories')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Test Category',
          description: 'This is a test category'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        ...mockCategory,
        createdAt: mockCategory.createdAt.toISOString(),
        updatedAt: mockCategory.updatedAt.toISOString()
      });
      expect(categoryService.create).toHaveBeenCalledWith({
        name: 'Test Category',
        description: 'This is a test category'
      });
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .post('/categories')
        .send({
          name: 'Test Category',
          description: 'This is a test category'
        });

      expect(response.status).toBe(401);
    });

    it('should return 409 when category with same name already exists', async () => {
      (categoryService.create as jest.Mock).mockRejectedValue(
        new Error("Category with name 'Test Category' already exists")
      );

      const response = await request(app)
        .post('/categories')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Test Category',
          description: 'This is a test category'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe("Category with name 'Test Category' already exists");
    });

    it('should return 500 on server error', async () => {
      (categoryService.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/categories')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Test Category',
          description: 'This is a test category'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create category');
    });
  });

  describe('GET /categories', () => {
    it('should get all categories successfully', async () => {
      const mockCategories = [mockCategory, { ...mockCategory, id: '789', name: 'Another Category', slug: 'another-category' }];
      (categoryService.getAll as jest.Mock).mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/categories');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories.map(cat => ({
        ...cat,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString()
      })));
      expect(categoryService.getAll).toHaveBeenCalled();
    });

    it('should return 500 on server error', async () => {
      (categoryService.getAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/categories');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve categories');
    });
  });

  describe('GET /categories/:id', () => {
    it('should get a category by ID successfully', async () => {
      (categoryService.getById as jest.Mock).mockResolvedValue(mockCategory);

      const response = await request(app)
        .get(`/categories/${mockCategory.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...mockCategory,
        createdAt: mockCategory.createdAt.toISOString(),
        updatedAt: mockCategory.updatedAt.toISOString()
      });
      expect(categoryService.getById).toHaveBeenCalledWith(mockCategory.id);
    });

    it('should return 404 when category not found', async () => {
      (categoryService.getById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/categories/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Category not found');
    });

    it('should return 500 on server error', async () => {
      (categoryService.getById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/categories/${mockCategory.id}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve category');
    });
  });

  describe('PUT /categories/:id', () => {
    it('should update a category successfully', async () => {
      const updatedCategory = {
        ...mockCategory,
        name: 'Updated Category',
        description: 'Updated description'
      };
      (categoryService.update as jest.Mock).mockResolvedValue(updatedCategory);

      const response = await request(app)
        .put(`/categories/${mockCategory.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Updated Category',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...updatedCategory,
        createdAt: updatedCategory.createdAt.toISOString(),
        updatedAt: updatedCategory.updatedAt.toISOString()
      });
      expect(categoryService.update).toHaveBeenCalledWith(mockCategory.id, {
        name: 'Updated Category',
        description: 'Updated description'
      });
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .put(`/categories/${mockCategory.id}`)
        .send({
          name: 'Updated Category'
        });

      expect(response.status).toBe(401);
    });

    it('should return 404 when category not found', async () => {
      (categoryService.update as jest.Mock).mockRejectedValue(
        new Error(`Category with id 'nonexistent-id' not found`)
      );

      const response = await request(app)
        .put('/categories/nonexistent-id')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Updated Category'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(`Category with id 'nonexistent-id' not found`);
    });

    it('should return 409 when updated name already exists', async () => {
      (categoryService.update as jest.Mock).mockRejectedValue(
        new Error(`Category with name 'Existing Category' already exists`)
      );

      const response = await request(app)
        .put(`/categories/${mockCategory.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Existing Category'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe(`Category with name 'Existing Category' already exists`);
    });

    it('should return 500 on server error', async () => {
      (categoryService.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/categories/${mockCategory.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Updated Category'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update category');
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should delete a category successfully', async () => {
      (categoryService.delete as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/categories/${mockCategory.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(204);
      expect(categoryService.delete).toHaveBeenCalledWith(mockCategory.id);
    });

    it('should return 401 when no authentication token provided', async () => {
      const response = await request(app)
        .delete(`/categories/${mockCategory.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 when category not found', async () => {
      (categoryService.delete as jest.Mock).mockRejectedValue(
        new Error(`Category with id 'nonexistent-id' not found`)
      );

      const response = await request(app)
        .delete('/categories/nonexistent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(`Category with id 'nonexistent-id' not found`);
    });

    it('should return 500 on server error', async () => {
      (categoryService.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/categories/${mockCategory.id}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete category');
    });
  });

  describe('GET /categories/:id/articles', () => {
    it('should get articles by category successfully', async () => {
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
          categoryIds: [mockCategory.id],
          tagIds: []
        }
      ];
      (categoryService.getArticlesByCategory as jest.Mock).mockResolvedValue(mockArticles);

      const response = await request(app)
        .get(`/categories/${mockCategory.id}/articles`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockArticles.map(article => ({
        ...article,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        publishedAt: article.publishedAt.toISOString()
      })));
      expect(categoryService.getArticlesByCategory).toHaveBeenCalledWith(mockCategory.id);
    });

    it('should return 404 when category not found', async () => {
      (categoryService.getArticlesByCategory as jest.Mock).mockRejectedValue(
        new Error(`Category with id 'nonexistent-id' not found`)
      );

      const response = await request(app)
        .get('/categories/nonexistent-id/articles');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(`Category with id 'nonexistent-id' not found`);
    });

    it('should return 500 on server error', async () => {
      (categoryService.getArticlesByCategory as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/categories/${mockCategory.id}/articles`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve articles for category');
    });
  });
});