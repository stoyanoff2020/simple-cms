import { Request, Response } from 'express';
import { tagService } from '../services/TagService';

export class TagController {
  /**
   * Create a new tag or get existing one
   * POST /tags
   */
  async createOrGet(req: Request, res: Response): Promise<void> {
    try {
      const tagName = req.body.name;
      
      if (!tagName) {
        res.status(400).json({ error: 'Tag name is required' });
        return;
      }
      
      const tag = await tagService.createOrGet(tagName);
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create tag' });
    }
  }

  /**
   * Get all tags
   * GET /tags
   */
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const tags = await tagService.getAll();
      res.status(200).json(tags);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve tags' });
    }
  }

  /**
   * Get a tag by ID
   * GET /tags/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const tagId = req.params.id;
      const tag = await tagService.getById(tagId);
      
      if (!tag) {
        res.status(404).json({ error: 'Tag not found' });
        return;
      }
      
      res.status(200).json(tag);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve tag' });
    }
  }

  /**
   * Get articles by tag
   * GET /tags/:id/articles
   */
  async getArticlesByTag(req: Request, res: Response): Promise<void> {
    try {
      const tagId = req.params.id;
      const articles = await tagService.getArticlesByTag(tagId);
      res.status(200).json(articles);
    } catch (error: any) {
      if (error.message && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to retrieve articles for tag' });
      }
    }
  }

  /**
   * Clean up unused tags
   * DELETE /tags/cleanup
   */
  async cleanupUnusedTags(_req: Request, res: Response): Promise<void> {
    try {
      const deletedCount = await tagService.cleanupUnusedTags();
      res.status(200).json({ 
        message: `Successfully removed ${deletedCount} unused tags`,
        deletedCount 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clean up unused tags' });
    }
  }

  /**
   * Search tags by name
   * GET /tags/search?q=searchTerm
   */
  async searchByName(req: Request, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      if (!searchTerm) {
        res.status(400).json({ error: 'Search term is required' });
        return;
      }
      
      const tags = await tagService.searchByName(searchTerm, limit);
      res.status(200).json(tags);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search tags' });
    }
  }

  /**
   * Get popular tags
   * GET /tags/popular
   */
  async getPopular(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const tags = await tagService.getPopular(limit);
      res.status(200).json(tags);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve popular tags' });
    }
  }
}

export const tagController = new TagController();