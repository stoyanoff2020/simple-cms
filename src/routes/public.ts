import { Router } from 'express';
import { PublicArticleController } from '../controllers/PublicArticleController';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schema for article listing query parameters
const articleListingSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('published_at', 'title').default('published_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate'))
});

// Validation schema for related articles query parameters
const relatedArticlesSchema = Joi.object({
  relatedLimit: Joi.number().integer().min(1).max(20).default(5)
});

// GET /public/articles - Get all published articles
router.get(
  '/articles',
  validateRequest(articleListingSchema, 'query'),
  PublicArticleController.getPublishedArticles
);

// GET /public/articles/:id - Get a published article by ID
router.get(
  '/articles/:id',
  validateRequest(relatedArticlesSchema, 'query'),
  PublicArticleController.getPublishedArticleById
);

export default router;