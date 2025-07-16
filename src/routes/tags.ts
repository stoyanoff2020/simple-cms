import { Router } from 'express';
import { tagController } from '../controllers/TagController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const tagIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const popularTagsSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10)
});

const searchTagsSchema = Joi.object({
  q: Joi.string().required().min(1).max(50),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

const createTagSchema = Joi.object({
  name: Joi.string().required().min(1).max(50)
});

const articleListingSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('published', 'draft', 'archived'),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'published_at', 'title').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Public routes
router.get('/', tagController.getAll.bind(tagController));

router.get(
  '/popular',
  validateRequest(popularTagsSchema, 'query'),
  tagController.getPopular.bind(tagController)
);

router.get(
  '/search',
  validateRequest(searchTagsSchema, 'query'),
  tagController.searchByName.bind(tagController)
);

router.get(
  '/:id',
  validateRequest(tagIdSchema, 'params'),
  tagController.getById.bind(tagController)
);

router.get(
  '/:id/articles',
  validateRequest(tagIdSchema, 'params'),
  validateRequest(articleListingSchema, 'query'),
  tagController.getArticlesByTag.bind(tagController)
);

// Protected routes
router.post(
  '/',
  validateRequest(createTagSchema),
  authenticateToken,
  tagController.createOrGet.bind(tagController)
);

router.delete(
  '/cleanup',
  authenticateToken,
  tagController.cleanupUnusedTags.bind(tagController)
);

export default router;