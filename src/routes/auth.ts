// Authentication routes
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().required().min(3).max(50).alphanum(),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(8).max(100)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
    .message('Password must contain at least one uppercase letter, one lowercase letter, and one number')
});

const loginSchema = Joi.object({
  email: Joi.string().required().email(),
  password: Joi.string().required()
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().required().email()
});

const verifyTokenSchema = Joi.object({
  token: Joi.string().required()
});

// POST /auth/register - User registration
router.post(
  '/register',
  validateRequest(registerSchema),
  AuthController.register
);

// POST /auth/login - User login
router.post(
  '/login',
  validateRequest(loginSchema),
  AuthController.login
);

// POST /auth/reset-password - Password reset request
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  AuthController.resetPassword
);

// GET /auth/verify - Verify token
router.get(
  '/verify',
  validateRequest(verifyTokenSchema, 'query'),
  AuthController.verifyToken
);

export default router;