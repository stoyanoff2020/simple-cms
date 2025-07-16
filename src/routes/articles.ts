// Article routes
import { Router } from 'express';
import { ArticleController } from '../controllers/ArticleController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const articleIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const authorIdSchema = Joi.object({
  authorId: Joi.string().uuid().required()
});

const articleListingSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('draft', 'published', 'archived'),
  category: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ),
  tag: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'published_at', 'title').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const createArticleSchema = Joi.object({
  title: Joi.string().required().min(3).max(255),
  content: Joi.string().required(),
  excerpt: Joi.string().max(500),
  status: Joi.string().valid('draft', 'published').default('draft'),
  categoryIds: Joi.array().items(Joi.string().uuid()),
  tags: Joi.array().items(Joi.string().min(1).max(50))
});

const updateArticleSchema = Joi.object({
  title: Joi.string().min(3).max(255),
  content: Joi.string(),
  excerpt: Joi.string().max(500).allow(''),
  status: Joi.string().valid('draft', 'published', 'archived'),
  categoryIds: Joi.array().items(Joi.string().uuid()),
  tags: Joi.array().items(Joi.string().min(1).max(50))
}).min(1);

// GET /articles/author/:authorId - Get articles by specific author (optional auth)
router.get(
  '/author/:authorId', 
  validateRequest(authorIdSchema, 'params'),
  validateRequest(articleListingSchema, 'query'),
  optionalAuth, 
  ArticleController.getByAuthor
);

// GET /articles - Get all articles with pagination and filtering (optional auth)
router.get(
  '/', 
  validateRequest(articleListingSchema, 'query'),
  optionalAuth, 
  ArticleController.getAll
);

// POST /articles - Create a new article (requires authentication)
router.post(
  '/', 
  validateRequest(createArticleSchema),
  authenticateToken, 
  ArticleController.create
);

// GET /articles/:id - Get article by ID (optional auth)
router.get(
  '/:id', 
  validateRequest(articleIdSchema, 'params'),
  optionalAuth, 
  ArticleController.getById
);

// PUT /articles/:id - Update article (requires authentication)
router.put(
  '/:id', 
  validateRequest(articleIdSchema, 'params'),
  validateRequest(updateArticleSchema),
  authenticateToken, 
  ArticleController.update
);

// DELETE /articles/:id - Delete article (requires authentication)
router.delete(
  '/:id', 
  validateRequest(articleIdSchema, 'params'),
  authenticateToken, 
  ArticleController.delete
);

export default router;