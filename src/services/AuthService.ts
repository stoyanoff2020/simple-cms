// Authentication service implementation
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../models';
import { userRepository } from '../repositories/UserRepository';
import { generateToken, verifyToken as verifyJWT, generateResetToken, JWTPayload } from '../utils/auth';

export interface IAuthService {
  register(userData: CreateUserRequest): Promise<User>;
  login(credentials: LoginRequest): Promise<AuthResponse>;
  resetPassword(email: string): Promise<void>;
  verifyToken(token: string): Promise<User>;
}

export class AuthService implements IAuthService {
  async register(userData: CreateUserRequest): Promise<User> {
    // Validate input
    if (!userData.username || !userData.email || !userData.password) {
      throw new Error('Username, email, and password are required');
    }

    // Validate password strength
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUserByEmail = await userRepository.findByEmail(userData.email);
    if (existingUserByEmail) {
      throw new Error('User with this email already exists');
    }

    const existingUserByUsername = await userRepository.findByUsername(userData.username);
    if (existingUserByUsername) {
      throw new Error('User with this username already exists');
    }

    // Create user
    try {
      const user = await userRepository.create(userData);
      return user;
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new Error('User with this email or username already exists');
      }
      throw new Error('Failed to create user: ' + error.message);
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    // Find user by email
    const user = await userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await userRepository.verifyPassword(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const tokenPayload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const token = generateToken(tokenPayload);

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  async resetPassword(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email is required');
    }

    // Check if user exists
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return;
    }

    // Generate reset token
    const resetToken = generateResetToken();

    // In a real application, you would:
    // 1. Store the reset token in database with expiration
    // 2. Send email with reset link containing the token
    // For now, we'll just log it (in production, remove this)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    // TODO: Implement email sending service
    // TODO: Store reset token in database
  }

  async verifyToken(token: string): Promise<User> {
    if (!token) {
      throw new Error('Token is required');
    }

    try {
      const payload = verifyJWT(token);
      const user = await userRepository.findById(payload.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error: any) {
      throw new Error('Invalid or expired token');
    }
  }
}

export const authService = new AuthService();