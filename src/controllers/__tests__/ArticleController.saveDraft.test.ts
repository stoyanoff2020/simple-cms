// Article controller saveDraft endpoint tests
import request from 'supertest';
import express from 'express';
import { ArticleController } from '../ArticleController';
import { articleService } from '../../services/ArticleService';
import { authenticateToken } from '../../middleware/auth';
import jwt from 'jsonwebtoken';

// Mock the article service
jest.mock('../../services/ArticleService', () => ({
  articleService: {
    getById: jest.fn(),
    saveDraft: jest.fn()
  }
}));
jest.mock('../../database/connection');

// Create test app
const app = express();
app.use(express.json());

// Add routes with authentication middleware
app.put('/articles/:id/draft', authenticateToken, ArticleController.saveDraft);

// Helper function to create JWT token for testing
const createTestToken = (payload: any) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
};

describe('ArticleController - saveDraft Endpoint', () => {
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

  it('should save draft successfully when user is the author', async () => {
    const draftUpdates = {
      title: 'Updated Draft Title',
      content: 'Updated draft content',
      excerpt: 'Updated excerpt'
    };

    const updatedDraft = {
      ...mockArticle,
      ...draftUpdates,
      updatedAt: new Date('2024-01-02T00:00:00Z')
    };

    (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
    (articleService.saveDraft as jest.Mock).mockResolvedValue(updatedDraft);

    const response = await request(app)
      .put(`/articles/${mockArticle.id}/draft`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(draftUpdates);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Updated Draft Title');
    expect(response.body.data.content).toBe('Updated draft content');
    expect(response.body.message).toBe('Draft saved successfully');
    expect(articleService.saveDraft).toHaveBeenCalledWith(
      mockArticle.id,
      draftUpdates
    );
  });

  it('should return 401 when no authentication token provided', async () => {
    const response = await request(app)
      .put(`/articles/${mockArticle.id}/draft`)
      .send({
        title: 'Updated Draft Title'
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  it('should return 404 when article not found', async () => {
    (articleService.getById as jest.Mock).mockResolvedValue(null);

    const response = await request(app)
      .put('/articles/nonexistent-id/draft')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Updated Draft Title'
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBe('Article not found');
  });

  it('should return 403 when trying to save draft of another user\'s article', async () => {
    const otherUserArticle = {
      ...mockArticle,
      authorId: 'different-user-id'
    };
    (articleService.getById as jest.Mock).mockResolvedValue(otherUserArticle);

    const response = await request(app)
      .put(`/articles/${mockArticle.id}/draft`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Updated Draft Title'
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.message).toBe('You can only save drafts of your own articles');
  });

  it('should handle validation errors', async () => {
    (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
    (articleService.saveDraft as jest.Mock).mockRejectedValue(new Error('Article title is too long (max 1000 characters)'));

    const response = await request(app)
      .put(`/articles/${mockArticle.id}/draft`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'a'.repeat(1001)
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Article title is too long (max 1000 characters)');
  });

  it('should save draft with partial updates', async () => {
    const partialUpdates = {
      title: 'Updated Draft Title'
      // No content or excerpt updates
    };

    const updatedDraft = {
      ...mockArticle,
      title: 'Updated Draft Title',
      updatedAt: new Date('2024-01-02T00:00:00Z')
    };

    (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
    (articleService.saveDraft as jest.Mock).mockResolvedValue(updatedDraft);

    const response = await request(app)
      .put(`/articles/${mockArticle.id}/draft`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(partialUpdates);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(articleService.saveDraft).toHaveBeenCalledWith(
      mockArticle.id,
      partialUpdates
    );
  });

  it('should handle service errors gracefully', async () => {
    (articleService.getById as jest.Mock).mockResolvedValue(mockArticle);
    (articleService.saveDraft as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .put(`/articles/${mockArticle.id}/draft`)
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: 'Updated Draft Title'
      });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).toBe('Failed to save draft');
  });

  it('should save draft from a published article', async () => {
    const publishedArticle = {
      ...mockArticle,
      status: 'published' as const,
      publishedAt: new Date('2024-01-01T12:00:00Z')
    };

    const draftUpdates = {
      title: 'Updated Draft Title',
      content: 'Updated draft content'
    };

    const savedDraft = {
      ...publishedArticle,
      ...draftUpdates,
      status: 'draft' as const,
      updatedAt: new Date('2024-01-02T00:00:00Z')
    };

    (articleService.getById as jest.Mock).mockResolvedValue(publishedArticle);
    (articleService.saveDraft as jest.Mock).mockResolvedValue(savedDraft);

    const response = await request(app)
      .put(`/articles/${mockArticle.id}/draft`)
      .set('Authorization', `Bearer ${validToken}`)
      .send(draftUpdates);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('draft');
    expect(response.body.message).toBe('Draft saved successfully');
  });
});