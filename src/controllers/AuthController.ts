// Authentication controller
import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { CreateUserRequest, LoginRequest } from '../models';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role || 'author'
      };

      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username, email, and password are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate role if provided
      if (userData.role && !['admin', 'author', 'reader'].includes(userData.role)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Role must be one of: admin, author, reader',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const user = await authService.register(userData);
      
      // Return user without password hash
      const { passwordHash, ...userResponse } = user;
      
      res.status(201).json({
        message: 'User registered successfully',
        user: userResponse
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } else if (error.message.includes('Password must be') || error.message.includes('Invalid email')) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Registration failed',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginRequest = {
        email: req.body.email,
        password: req.body.password
      };

      // Validate required fields
      if (!credentials.email || !credentials.password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const authResponse = await authService.login(credentials);
      
      res.status(200).json({
        message: 'Login successful',
        ...authResponse
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message === 'Invalid credentials') {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid email or password',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Login failed',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await authService.resetPassword(email);
      
      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        message: 'If an account with this email exists, a password reset link has been sent'
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Password reset failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  static async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authorization header with Bearer token is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const user = await authService.verifyToken(token);
      
      // Return user without password hash
      const { passwordHash, ...userResponse } = user;
      
      res.status(200).json({
        message: 'Token is valid',
        user: userResponse
      });
    } catch (error: any) {
      console.error('Token verification error:', error);
      
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}