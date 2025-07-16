// Comprehensive authentication workflow integration test
import request from 'supertest';
import express from 'express';
import { seedTestDb } from '../../database/test-config';
import { generateToken } from '../../utils/auth';
import { userRepository } from '../../repositories/UserRepository';

// Import the app
import app from '../../index';

describe('Authentication Workflow Integration Tests', () => {
  // Seed the database with test data before tests
  beforeAll(async () => {
    await seedTestDb('../seeds/test-seed.sql');
  });

  describe('User Registration and Authentication Flow', () => {
    const testUser = {
      username: 'integrationuser',
      email: 'integration@test.com',
      password: 'SecurePassword123',
      role: 'author'
    };
    
    let userId: string;
    let authToken: string;

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe(testUser.role);
      
      // Store user ID for subsequent tests
      userId = response.body.user.id;
    });

    it('should not allow registration with existing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
      
      // Store token for subsequent tests
      authToken = response.body.token;
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token is valid');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle password reset request', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testUser.email
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account with this email exists, a password reset link has been sent');
    });

    it('should update user profile when authenticated', async () => {
      const updatedProfile = {
        username: 'updatedusername'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedProfile);

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe(updatedProfile.username);
    });

    it('should logout and invalidate token', async () => {
      // Note: This test assumes there's a logout endpoint that invalidates tokens
      // If not implemented, this would be a good feature to add
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
      
      // Verify token is no longer valid
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyResponse.status).toBe(401);
    });
  });

  describe('Role-based Access Control', () => {
    let adminToken: string;
    let authorToken: string;
    let readerToken: string;

    beforeAll(async () => {
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
      
      readerToken = generateToken({
        userId: '33333333-3333-3333-3333-333333333333',
        username: 'testreader',
        email: 'reader@test.com',
        role: 'reader'
      });
    });

    it('should allow admin to access admin-only resources', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny author access to admin-only resources', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin and author to create articles', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'This is a test article content',
        excerpt: 'Test excerpt'
      };

      const adminResponse = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleData);

      expect(adminResponse.status).toBe(201);

      const authorResponse = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${authorToken}`)
        .send(articleData);

      expect(authorResponse.status).toBe(201);
    });

    it('should deny reader from creating articles', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'This is a test article content',
        excerpt: 'Test excerpt'
      };

      const response = await request(app)
        .post('/api/articles')
        .set('Authorization', `Bearer ${readerToken}`)
        .send(articleData);

      expect(response.status).toBe(403);
    });

    it('should allow all authenticated users to view published articles', async () => {
      const response = await request(app)
        .get('/api/articles')
        .set('Authorization', `Bearer ${readerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.articles)).toBe(true);
    });
  });
});