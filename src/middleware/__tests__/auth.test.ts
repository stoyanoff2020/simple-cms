import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, optionalAuth } from '../auth';
import { generateToken, JWTPayload } from '../../utils/auth';

// Mock response object
const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock request object
const mockRequest = (authHeader?: string): Partial<Request> => {
  const req: Partial<Request> = {
    headers: authHeader ? { authorization: authHeader } : {}
  };
  return req;
};

const mockNext: NextFunction = jest.fn();

describe('Authentication Middleware', () => {
  const mockUser: JWTPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    role: 'author'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const token = generateToken(mockUser);
      const req = mockRequest(`Bearer ${token}`) as Request;
      const res = mockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(req.user).toEqual(expect.objectContaining({
        userId: mockUser.userId,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role
      }));
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      const req = mockRequest('Bearer invalid-token') as Request;
      const res = mockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', () => {
      const req = mockRequest('InvalidFormat') as Request;
      const res = mockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with correct role', () => {
      const req = mockRequest() as Request;
      req.user = mockUser;
      const res = mockResponse() as Response;
      const middleware = requireRole('author');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple allowed roles', () => {
      const req = mockRequest() as Request;
      req.user = mockUser;
      const res = mockResponse() as Response;
      const middleware = requireRole(['admin', 'author']);

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      const req = mockRequest() as Request;
      req.user = mockUser;
      const res = mockResponse() as Response;
      const middleware = requireRole('admin');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const middleware = requireRole('author');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user when valid token provided', () => {
      const token = generateToken(mockUser);
      const req = mockRequest(`Bearer ${token}`) as Request;
      const res = mockResponse() as Response;

      optionalAuth(req, res, mockNext);

      expect(req.user).toEqual(expect.objectContaining({
        userId: mockUser.userId,
        username: mockUser.username,
        email: mockUser.email,
        role: mockUser.role
      }));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when no token provided', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', () => {
      const req = mockRequest('Bearer invalid-token') as Request;
      const res = mockResponse() as Response;

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});