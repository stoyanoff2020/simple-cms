import { Request, Response } from 'express';
import { categoryService } from '../services/CategoryService';
import { CreateCategoryRequest, UpdateCategoryRequest } from '../models/Category';

export class CategoryController {
  /**
   * Create a new category
   * POST /categories
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const categoryData: CreateCategoryRequest = {
        name: req.body.name,
        description: req.body.description
      };
      
      const category = await categoryService.create(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      if (error.message && error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create category' });
      }
    }
  }

  /**
   * Get all categories
   * GET /categories
   */
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await categoryService.getAll();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve categories' });
    }
  }

  /**
   * Get a category by ID
   * GET /categories/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.id;
      const category = await categoryService.getById(categoryId);
      
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      
      res.status(200).json(category);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve category' });
    }
  }

  /**
   * Update a category
   * PUT /categories/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.id;
      const updates: UpdateCategoryRequest = {};
      
      if (req.body.name !== undefined) {
        updates.name = req.body.name;
      }
      
      if (req.body.description !== undefined) {
        updates.description = req.body.description;
      }
      
      const updatedCategory = await categoryService.update(categoryId, updates);
      res.status(200).json(updatedCategory);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error.message && error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update category' });
      }
    }
  }

  /**
   * Delete a category
   * DELETE /categories/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.id;
      await categoryService.delete(categoryId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete category' });
      }
    }
  }

  /**
   * Get articles by category
   * GET /categories/:id/articles
   */
  async getArticlesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const categoryId = req.params.id;
      const articles = await categoryService.getArticlesByCategory(categoryId);
      res.status(200).json(articles);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to retrieve articles for category' });
      }
    }
  }
}

export const categoryController = new CategoryController();