// Authentication service unit tests
import { AuthService } from '../AuthService';
import { userRepository } from '../../repositories/UserRepository';
import { generateToken, verifyToken } from '../../utils/auth';

// Mock dependencies
jest.mock('../../repositories/UserRepository');
jest.mock('../../utils/auth');

describe('AuthService', () => {
  let authService: AuthService;
  const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
  const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;
  const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'author' as const
    };

    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'author' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register(validUserData);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validUserData.email);
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(validUserData.username);
      expect(mockUserRepository.create).toHaveBeenCalledWith(validUserData);
    });

    it('should throw error for missing username', async () => {
      const invalidData = { ...validUserData, username: '' };

      await expect(authService.register(invalidData)).rejects.toThrow('Username, email, and password are required');
    });

    it('should throw error for missing email', async () => {
      const invalidData = { ...validUserData, email: '' };

      await expect(authService.register(invalidData)).rejects.toThrow('Username, email, and password are required');
    });

    it('should throw error for missing password', async () => {
      const invalidData = { ...validUserData, password: '' };

      await expect(authService.register(invalidData)).rejects.toThrow('Username, email, and password are required');
    });

    it('should throw error for existing email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(validUserData)).rejects.toThrow('User with this email already exists');
    });

    it('should throw error for existing username', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      await expect(authService.register(validUserData)).rejects.toThrow('User with this username already exists');
    });

    it('should throw error for short password', async () => {
      const invalidData = { ...validUserData, password: '123' };

      await expect(authService.register(invalidData)).rejects.toThrow('Password must be at least 6 characters long');
    });

    it('should throw error for invalid email format', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      await expect(authService.register(invalidData)).rejects.toThrow('Invalid email format');
    });

    it('should handle database constraint violation', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      
      const dbError = new Error('Database error') as any;
      dbError.code = '23505'; // PostgreSQL unique constraint violation
      mockUserRepository.create.mockRejectedValue(dbError);

      await expect(authService.register(validUserData)).rejects.toThrow('User with this email or username already exists');
    });
  });

  describe('login', () => {
    const validCredentials = {
      email: 'test@example.com',
      password: 'password123'
    };

    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'author' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should login user successfully with valid credentials', async () => {
      const mockToken = 'mock-jwt-token';
      
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(true);
      mockGenerateToken.mockReturnValue(mockToken);

      const result = await authService.login(validCredentials);

      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt
      });
      expect(result.token).toBe(mockToken);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(validCredentials.email);
      expect(mockUserRepository.verifyPassword).toHaveBeenCalledWith(validCredentials.password, mockUser.passwordHash);
    });

    it('should throw error for missing email', async () => {
      const invalidCredentials = { ...validCredentials, email: '' };

      await expect(authService.login(invalidCredentials)).rejects.toThrow('Email and password are required');
    });

    it('should throw error for missing password', async () => {
      const invalidCredentials = { ...validCredentials, password: '' };

      await expect(authService.login(invalidCredentials)).rejects.toThrow('Email and password are required');
    });

    it('should throw error for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(validCredentials)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(false);

      await expect(authService.login(validCredentials)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('resetPassword', () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'author' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should handle password reset for existing user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Mock console.log to verify token generation
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authService.resetPassword('test@example.com');

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Password reset token for test@example.com:'));
      
      consoleSpy.mockRestore();
    });

    it('should handle password reset for non-existent user silently', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.resetPassword('nonexistent@example.com')).resolves.not.toThrow();
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should throw error for missing email', async () => {
      await expect(authService.resetPassword('')).rejects.toThrow('Email is required');
    });
  });

  describe('verifyToken', () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'author' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockPayload = {
      userId: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      role: mockUser.role
    };

    it('should verify valid token successfully', async () => {
      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.verifyToken('valid-token');

      expect(result).toEqual(mockUser);
      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockPayload.userId);
    });

    it('should throw error for missing token', async () => {
      await expect(authService.verifyToken('')).rejects.toThrow('Token is required');
    });

    it('should throw error for invalid token', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken('invalid-token')).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error when user not found', async () => {
      mockVerifyToken.mockReturnValue(mockPayload);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.verifyToken('valid-token')).rejects.toThrow('Invalid or expired token');
    });
  });
});