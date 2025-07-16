import { Router } from 'express';
import { categoryController } from '../controllers/CategoryController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const categoryIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const createCategorySchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().max(500).allow('', null)
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500).allow('', null)
}).min(1);

const articleListingSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('published', 'draft', 'archived'),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'published_at', 'title').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Public routes
router.get('/', categoryController.getAll.bind(categoryController));

router.get(
  '/:id', 
  validateRequest(categoryIdSchema, 'params'),
  categoryController.getById.bind(categoryController)
);

router.get(
  '/:id/articles', 
  validateRequest(categoryIdSchema, 'params'),
  validateRequest(articleListingSchema, 'query'),
  categoryController.getArticlesByCategory.bind(categoryController)
);

// Protected routes
router.post(
  '/', 
  validateRequest(createCategorySchema),
  authenticateToken, 
  categoryController.create.bind(categoryController)
);

router.put(
  '/:id', 
  validateRequest(categoryIdSchema, 'params'),
  validateRequest(updateCategorySchema),
  authenticateToken, 
  categoryController.update.bind(categoryController)
);

router.delete(
  '/:id', 
  validateRequest(categoryIdSchema, 'params'),
  authenticateToken, 
  categoryController.delete.bind(categoryController)
);

export default router;