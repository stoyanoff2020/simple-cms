import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
const searchController = new SearchController();

// Validation schema for search query
const searchQuerySchema = Joi.object({
  q: Joi.string().required().trim().min(1).max(100),
  category: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ),
  tag: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ),
  author: Joi.string().uuid(),
  status: Joi.string().valid('draft', 'published', 'archived'),
  from: Joi.date().iso(),
  to: Joi.date().iso().greater(Joi.ref('from'))
});

// Validation schema for suggestions query
const suggestionsQuerySchema = Joi.object({
  q: Joi.string().required().trim().min(1).max(100)
});

// GET /search - Search articles
router.get(
  '/',
  validateRequest(searchQuerySchema, 'query'),
  searchController.search.bind(searchController)
);

// GET /search/suggestions - Get search suggestions
router.get(
  '/suggestions',
  validateRequest(suggestionsQuerySchema, 'query'),
  searchController.getSuggestions.bind(searchController)
);

export default router;