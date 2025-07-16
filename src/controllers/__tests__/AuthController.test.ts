// Authentication controller integration tests
import request from 'supertest';
import express from 'express';
import { AuthController } from '../AuthController';
import { userRepository } from '../../repositories/UserRepository';

// Mock database connection for tests
jest.mock('../../database/connection');

// Create test app
const app = express();
app.use(express.json());
app.post('/auth/register', AuthController.register);
app.post('/auth/login', AuthController.login);
app.post('/auth/reset-password', AuthController.resetPassword);
app.get('/auth/verify', AuthController.verifyToken);

describe('AuthController Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'author'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      });
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser'
          // Missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Username, email, and password are required');
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'invalid_role'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Role must be one of: admin, author, reader');
    });

    it('should return 409 for existing email', async () => {
      const existingUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'existinguser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toBe('User with this email already exists');
    });

    it('should return 409 for existing username', async () => {
      const existingUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'existing@example.com',
        passwordHash: 'hashedpassword',
        role: 'author' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findByUsername').mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toBe('User with this username already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'verifyPassword').mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      });
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Email and password are required');
    });

    it('should return 401 for non-existent user', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'verifyPassword').mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should handle password reset request successfully', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account with this email exists, a password reset link has been sent');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Email is required');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid email format');
    });

    it('should return success even for non-existent email (security)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          email: 'nonexistent@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account with this email exists, a password reset link has been sent');
    });
  });

  describe('GET /auth/verify', () => {
    it('should verify valid token successfully', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);

      // Create a valid token for testing
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        {
          userId: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token is valid');
      expect(response.body.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      });
    });

    it('should return 401 for missing authorization header', async () => {
      const response = await request(app)
        .get('/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toBe('Authorization header with Bearer token is required');
    });

    it('should return 401 for invalid token format', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'InvalidToken');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toBe('Authorization header with Bearer token is required');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toBe('Invalid or expired token');
    });
  });
});