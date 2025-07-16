// Comprehensive search and content discovery workflow integration test
import request from 'supertest';
import { seedTestDb } from '../../database/test-config';
import { generateToken } from '../../utils/auth';

// Import the app
import app from '../../index';

describe('Search and Content Discovery Workflow Integration Tests', () => {
  // Test user tokens
  let authorToken: string;
  
  // Test article IDs
  let articleIds: string[] = [];
  
  // Seed the database with test data before tests
  beforeAll(async () => {
    await seedTestDb('../seeds/test-seed.sql');
    
    // Generate token for author
    authorToken = generateToken({
      userId: '22222222-2222-2222-2222-222222222222',
      username: 'testauthor',
      email: 'author@test.com',
      role: 'author'
    });
    
    // Create test articles with specific content for search testing
    const testArticles = [
      {
        title: 'JavaScript Fundamentals',
        content: 'JavaScript is a programming language that powers the dynamic behavior on most websites. It is an essential skill for web developers.',
        excerpt: 'Learn the basics of JavaScript programming',
        status: 'published',
        tags: ['javascript', 'programming', 'web development']
      },
      {
        title: 'Advanced TypeScript Techniques',
        content: 'TypeScript extends JavaScript by adding types. It is a typed superset of JavaScript that compiles to plain JavaScript.',
        excerpt: 'Explore advanced TypeScript features',
        status: 'published',
        tags: ['typescript', 'programming', 'javascript']
      },
      {
        title: 'React Hooks Tutorial',
        content: 'React Hooks are functions that let you use state and other React features without writing a class component.',
        excerpt: 'Learn how to use React Hooks',
        status: 'published',
        tags: ['react', 'javascript', 'frontend']
      },
      {
        title: 'Node.js API Development',
        content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It allows developers to run JavaScript on the server.',
        excerpt: 'Build APIs with Node.js',
        status: 'published',
        tags: ['nodejs', 'javascript', 'backend', 'api']
      }
    ];
    
    // Create the test articles
    for (const article of testArticles) {
      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(article);
      
      if (response.status === 201) {
        articleIds.push(response.body.article.id);
        
        // Add tags to the article
        if (article.tags && article.tags.length > 0) {
          await request(app)
            .put(`/api/articles/${response.body.article.id}/tags`)
            .set('Authorization', `Bearer ${authorToken}`)
            .send({ tags: article.tags });
        }
      }
    }
  });

  describe('Basic Search Functionality', () => {
    it('should search articles by keyword', async () => {
      const response = await request(app)
        .get('/api/search?q=javascript');

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
      
      // All results should contain "javascript" in title, content, or tags
      response.body.results.forEach((result: any) => {
        const containsJavascript = 
          result.title.toLowerCase().includes('javascript') ||
          result.content.toLowerCase().includes('javascript') ||
          (result.tags && result.tags.some((tag: any) => 
            tag.name.toLowerCase() === 'javascript'));
        
        expect(containsJavascript).toBe(true);
      });
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/search?q=nonexistentterm123456');

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBe(0);
    });

    it('should provide search suggestions when no results found', async () => {
      const response = await request(app)
        .get('/api/search?q=javascrip');  // Misspelled term

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions).toContain('javascript');
    });
  });

  describe('Advanced Search Features', () => {
    it('should filter search results by category', async () => {
      // First, assign a category to one of our test articles
      await request(app)
        .put(`/api/articles/${articleIds[0]}/categories`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ categoryIds: ['44444444-4444-4444-4444-444444444444'] });  // Technology category
      
      const response = await request(app)
        .get('/api/search?q=javascript&categoryId=44444444-4444-4444-4444-444444444444');

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      
      // All results should be in the Technology category
      response.body.results.forEach((result: any) => {
        expect(result.categories).toBeDefined();
        const inTechnologyCategory = result.categories.some(
          (category: any) => category.id === '44444444-4444-4444-4444-444444444444'
        );
        expect(inTechnologyCategory).toBe(true);
      });
    });

    it('should filter search results by tag', async () => {
      const response = await request(app)
        .get('/api/search?q=javascript&tag=frontend');

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      
      // All results should have the frontend tag
      response.body.results.forEach((result: any) => {
        expect(result.tags).toBeDefined();
        const hasFrontendTag = result.tags.some(
          (tag: any) => tag.name === 'frontend'
        );
        expect(hasFrontendTag).toBe(true);
      });
    });

    it('should sort search results by relevance', async () => {
      const response = await request(app)
        .get('/api/search?q=javascript&sort=relevance');

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      
      // Results should include relevance scores
      response.body.results.forEach((result: any) => {
        expect(result.relevanceScore).toBeDefined();
      });
      
      // Check that results are sorted by relevance score in descending order
      for (let i = 1; i < response.body.results.length; i++) {
        expect(response.body.results[i-1].relevanceScore)
          .toBeGreaterThanOrEqual(response.body.results[i].relevanceScore);
      }
    });

    it('should paginate search results', async () => {
      const response = await request(app)
        .get('/api/search?q=javascript&page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.currentPage).toBe(1);
    });
  });

  describe('Content Discovery Workflows', () => {
    it('should find related articles based on tags', async () => {
      // Get the first article
      const articleResponse = await request(app)
        .get(`/api/public/articles/${articleIds[0]}`);
      
      expect(articleResponse.status).toBe(200);
      
      // Get related articles
      const response = await request(app)
        .get(`/api/public/articles/${articleIds[0]}/related`);

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
      
      // Related articles should share tags with the original article
      if (response.body.articles.length > 0) {
        const originalArticleTags = articleResponse.body.article.tags.map((tag: any) => tag.name);
        
        response.body.articles.forEach((relatedArticle: any) => {
          const relatedArticleTags = relatedArticle.tags.map((tag: any) => tag.name);
          
          // Check if there's at least one common tag
          const hasCommonTag = originalArticleTags.some((tag: string) => 
            relatedArticleTags.includes(tag)
          );
          
          expect(hasCommonTag).toBe(true);
        });
      }
    });

    it('should browse articles by category', async () => {
      const response = await request(app)
        .get('/api/public/categories/44444444-4444-4444-4444-444444444444/articles');

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
      
      // All articles should belong to the Technology category
      response.body.articles.forEach((article: any) => {
        expect(article.categories).toBeDefined();
        const inTechnologyCategory = article.categories.some(
          (category: any) => category.id === '44444444-4444-4444-4444-444444444444'
        );
        expect(inTechnologyCategory).toBe(true);
      });
    });

    it('should browse articles by tag', async () => {
      const response = await request(app)
        .get('/api/public/tags/javascript/articles');

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      expect(Array.isArray(response.body.articles)).toBe(true);
      
      // All articles should have the JavaScript tag
      response.body.articles.forEach((article: any) => {
        expect(article.tags).toBeDefined();
        const hasJavaScriptTag = article.tags.some(
          (tag: any) => tag.name.toLowerCase() === 'javascript'
        );
        expect(hasJavaScriptTag).toBe(true);
      });
    });

    it('should list popular tags', async () => {
      const response = await request(app)
        .get('/api/public/tags/popular');

      expect(response.status).toBe(200);
      expect(response.body.tags).toBeDefined();
      expect(Array.isArray(response.body.tags)).toBe(true);
      
      // Tags should include usage count
      response.body.tags.forEach((tag: any) => {
        expect(tag.name).toBeDefined();
        expect(tag.usageCount).toBeDefined();
      });
      
      // Tags should be sorted by usage count in descending order
      for (let i = 1; i < response.body.tags.length; i++) {
        expect(response.body.tags[i-1].usageCount)
          .toBeGreaterThanOrEqual(response.body.tags[i].usageCount);
      }
    });

    it('should list all categories', async () => {
      const response = await request(app)
        .get('/api/public/categories');

      expect(response.status).toBe(200);
      expect(response.body.categories).toBeDefined();
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories.length).toBeGreaterThan(0);
    });
  });
});