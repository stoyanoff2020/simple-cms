import { UserRepository } from '../UserRepository';
import { db } from '../../database/connection';
import { CreateUserRequest, UpdateUserRequest } from '../../models/User';

// Mock the database connection
jest.mock('../../database/connection');

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockQuery: jest.Mock;
  let mockGetClient: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    userRepository = new UserRepository();
    mockQuery = jest.fn();
    mockGetClient = jest.fn();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    (db as any).query = mockQuery;
    (db as any).getClient = mockGetClient;
    mockGetClient.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'author'
      };

      const mockResult = {
        rows: [{
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          role: 'author',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userRepository.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          userData.username,
          userData.email,
          expect.any(String), // hashed password
          userData.role
        ])
      );

      expect(result).toEqual({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should default role to author if not provided', async () => {
      const userData: CreateUserRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResult = {
        rows: [{
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          role: 'author',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await userRepository.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          userData.username,
          userData.email,
          expect.any(String),
          'author' // default role
        ])
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockResult = {
        rows: [{
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          role: 'author',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userRepository.findById('123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123']
      );

      expect(result).toEqual({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'author',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockResult = {
        rows: [{
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          role: 'author',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userRepository.findByEmail('test@example.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['test@example.com']
      );

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const updates: UpdateUserRequest = {
        username: 'newusername',
        email: 'newemail@example.com'
      };

      const mockResult = {
        rows: [{
          id: '123',
          username: 'newusername',
          email: 'newemail@example.com',
          password_hash: 'hashedpassword',
          role: 'author',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await userRepository.update('123', updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['newusername', 'newemail@example.com', '123'])
      );

      expect(result?.username).toBe('newusername');
      expect(result?.email).toBe('newemail@example.com');
    });

    it('should return existing user when no updates provided', async () => {
      const mockFindResult = {
        rows: [{
          id: '123',
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashedpassword',
          role: 'author',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockFindResult);

      const result = await userRepository.update('123', {});

      expect(result).toBeDefined();
      expect(result?.id).toBe('123');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      // Mock bcrypt.compare
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await userRepository.verifyPassword('password123', 'hashedpassword');

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
    });
  });

  describe('existsByEmail', () => {
    it('should return true when email exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '1' }] });

      const result = await userRepository.existsByEmail('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await userRepository.existsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete user and return true', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await userRepository.delete('123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        ['123']
      );
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await userRepository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});