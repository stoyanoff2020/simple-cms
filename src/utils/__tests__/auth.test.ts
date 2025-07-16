import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateResetToken,
  verifyResetToken,
  JWTPayload
} from '../auth';

describe('Auth Utilities', () => {
  const mockUser: JWTPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    role: 'author'
  };

  describe('JWT Token Operations', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify and decode a valid token', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded.userId).toBe(mockUser.userId);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow('Invalid or expired token');
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        verifyToken('malformed.token.here');
      }).toThrow('Invalid or expired token');
    });
  });

  describe('Password Operations', () => {
    const testPassword = 'testPassword123!';

    it('should hash a password', async () => {
      const hash = await hashPassword(testPassword);
      
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(testPassword);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should compare password with correct hash', async () => {
      const hash = await hashPassword(testPassword);
      const isMatch = await comparePassword(testPassword, hash);
      
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(testPassword);
      const isMatch = await comparePassword('wrongPassword', hash);
      
      expect(isMatch).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      const isMatch = await comparePassword('', hash);
      
      expect(isMatch).toBe(true);
    });
  });

  describe('Password Reset Token Operations', () => {
    it('should generate a reset token', () => {
      const resetToken = generateResetToken();
      
      expect(typeof resetToken).toBe('string');
      expect(resetToken.split('.')).toHaveLength(3); // JWT format
    });

    it('should verify a valid reset token', () => {
      const resetToken = generateResetToken();
      const isValid = verifyResetToken(resetToken);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid reset token', () => {
      const isValid = verifyResetToken('invalid-reset-token');
      
      expect(isValid).toBe(false);
    });

    it('should reject regular JWT token as reset token', () => {
      const regularToken = generateToken(mockUser);
      const isValid = verifyResetToken(regularToken);
      
      expect(isValid).toBe(false);
    });
  });
});