// Comprehensive article management workflow integration test
import request from 'supertest';
import { seedTestDb } from '../../database/test-config';
import { generateToken } from '../../utils/auth';

// Import the app
import app from '../../index';

describe('Article Management Workflow Integration Tests', () => {
  // Test user tokens
  let authorToken: string;
  let adminToken: string;
  
  // Test data IDs
  let articleId: string;
  let draftId: string;
  
  // Seed the database with test data before tests
  beforeAll(async () => {
    await seedTestDb('../seeds/test-seed.sql');
    
    // Generate tokens for different user roles
    adminToken = generateToken({
      userId: '11111111-1111-1111-1111-111111111111',
      username: 'testadmin',
      email: 'admin@test.com',
      role: 'admin'
    });
    
    authorToken = generateToken({
      userId: '22222222-2222-2222-2222-222222222222',
      username: 'testauthor',
      email: 'author@test.com',
      role: 'author'
    });
  });

  describe('Article Creation and Editing Workflow', () => {
    it('should create a new draft article', async () => {
      const articleData = {
        title: 'New Test Article',
        content: 'This is the content of my test article.',
        excerpt: 'A brief excerpt of the test article',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(articleData);

      expect(response.status).toBe(201);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.title).toBe(articleData.title);
      expect(response.body.article.status).toBe('draft');
      expect(response.body.article.authorId).toBe('22222222-2222-2222-2222-222222222222');
      
      // Store article ID for subsequent tests
      draftId = response.body.article.id;
    });

    it('should retrieve the created draft article', async () => {
      const response = await request(app)
        .get(`/api/articles/${draftId}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.id).toBe(draftId);
      expect(response.body.article.status).toBe('draft');
    });

    it('should update the draft article', async () => {
      const updateData = {
        title: 'Updated Test Article',
        content: 'This is the updated content of my test article.',
        excerpt: 'An updated brief excerpt'
      };

      const response = await request(app)
        .put(`/api/articles/${draftId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.title).toBe(updateData.title);
      expect(response.body.article.content).toBe(updateData.content);
      expect(response.body.article.excerpt).toBe(updateData.excerpt);
      expect(response.body.article.status).toBe('draft');
    });

    it('should assign categories to the article', async () => {
      const categoryData = {
        categoryIds: ['44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555']
      };

      const response = await request(app)
        .put(`/api/articles/${draftId}/categories`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(categoryData);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.categories).toBeDefined();
      expect(response.body.article.categories.length).toBe(2);
    });

    it('should assign tags to the article', async () => {
      const tagData = {
        tags: ['programming', 'javascript', 'testing']
      };

      const response = await request(app)
        .put(`/api/articles/${draftId}/tags`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(tagData);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.tags).toBeDefined();
      expect(response.body.article.tags.length).toBe(3);
    });
  });

  describe('Article Publishing Workflow', () => {
    it('should publish the draft article', async () => {
      const publishData = {
        status: 'published'
      };

      const response = await request(app)
        .put(`/api/articles/${draftId}/status`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(publishData);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.status).toBe('published');
      expect(response.body.article.publishedAt).toBeDefined();
      
      // Store published article ID
      articleId = draftId;
    });

    it('should make the published article publicly accessible', async () => {
      const response = await request(app)
        .get(`/api/public/articles/${articleId}`);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.id).toBe(articleId);
    });

    it('should list the published article in public articles', async () => {
      const response = await request(app)
        .get('/api/public/articles');

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
      
      // Check if our published article is in the list
      const foundArticle = response.body.articles.find((article: any) => article.id === articleId);
      expect(foundArticle).toBeDefined();
    });

    it('should unpublish the article', async () => {
      const unpublishData = {
        status: 'draft'
      };

      const response = await request(app)
        .put(`/api/articles/${articleId}/status`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send(unpublishData);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.status).toBe('draft');
    });

    it('should no longer show unpublished article in public articles', async () => {
      const response = await request(app)
        .get(`/api/public/articles/${articleId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Article Management and Permissions', () => {
    it('should create a new article and publish it immediately', async () => {
      const articleData = {
        title: 'Immediately Published Article',
        content: 'This article is published right away.',
        excerpt: 'Published immediately',
        status: 'published'
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleData);

      expect(response.status).toBe(201);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.status).toBe('published');
      expect(response.body.article.publishedAt).toBeDefined();
      
      articleId = response.body.article.id;
    });

    it('should allow admin to edit any article', async () => {
      const updateData = {
        title: 'Admin Updated Article',
        content: 'This content was updated by an admin.'
      };

      const response = await request(app)
        .put(`/api/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.article).toBeDefined();
      expect(response.body.article.title).toBe(updateData.title);
    });

    it('should soft delete an article', async () => {
      const response = await request(app)
        .delete(`/api/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Article deleted successfully');
    });

    it('should not show deleted article in article listings', async () => {
      const response = await request(app)
        .get('/api/articles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      
      // Check that our deleted article is not in the list
      const foundArticle = response.body.articles.find((article: any) => article.id === articleId);
      expect(foundArticle).toBeUndefined();
    });
  });

  describe('Article Filtering and Pagination', () => {
    beforeAll(async () => {
      // Create multiple articles for pagination testing
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/articles')
          .set('Authorization', `Bearer ${authorToken}`)
          .send({
            title: `Pagination Test Article ${i}`,
            content: `Content for pagination test article ${i}`,
            excerpt: `Excerpt ${i}`,
            status: 'published'
          });
      }
    });

    it('should paginate article results', async () => {
      const response = await request(app)
        .get('/api/articles?page=1&limit=3')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
      expect(response.body.articles.length).toBeLessThanOrEqual(3);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalItems).toBeGreaterThan(3);
      expect(response.body.pagination.totalPages).toBeGreaterThan(1);
      expect(response.body.pagination.currentPage).toBe(1);
    });

    it('should filter articles by status', async () => {
      const response = await request(app)
        .get('/api/articles?status=published')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
      
      // All returned articles should be published
      response.body.articles.forEach((article: any) => {
        expect(article.status).toBe('published');
      });
    });

    it('should filter articles by category', async () => {
      const response = await request(app)
        .get('/api/articles?categoryId=44444444-4444-4444-4444-444444444444')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
    });

    it('should filter articles by tag', async () => {
      const response = await request(app)
        .get('/api/articles?tag=programming')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
    });

    it('should sort articles by date', async () => {
      const response = await request(app)
        .get('/api/articles?sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
      
      // Check that articles are sorted by date in descending order
      for (let i = 1; i < response.body.articles.length; i++) {
        const prevDate = new Date(response.body.articles[i-1].createdAt).getTime();
        const currDate = new Date(response.body.articles[i].createdAt).getTime();
        expect(prevDate).toBeGreaterThanOrEqual(currDate);
      }
    });
  });
});