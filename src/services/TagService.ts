import { Tag } from '../models/Tag';
import { Article } from '../models/Article';
import { tagRepository } from '../repositories/TagRepository';
import { articleRepository } from '../repositories/ArticleRepository';

export interface TagService {
  createOrGet(tagName: string): Promise<Tag>;
  getAll(): Promise<Tag[]>;
  getById(id: string): Promise<Tag | null>;
  getArticlesByTag(tagId: string): Promise<Article[]>;
  cleanupUnusedTags(): Promise<number>;
  searchByName(searchTerm: string, limit?: number): Promise<Tag[]>;
  getPopular(limit?: number): Promise<Tag[]>;
}

export class TagServiceImpl implements TagService {
  async createOrGet(tagName: string): Promise<Tag> {
    if (!tagName || tagName.trim() === '') {
      throw new Error('Tag name cannot be empty');
    }
    
    return tagRepository.findOrCreate(tagName.trim());
  }

  async getAll(): Promise<Tag[]> {
    return tagRepository.findAll();
  }

  async getById(id: string): Promise<Tag | null> {
    return tagRepository.findById(id);
  }

  async getArticlesByTag(tagId: string): Promise<Article[]> {
    // Check if tag exists
    const tag = await tagRepository.findById(tagId);
    if (!tag) {
      throw new Error(`Tag with id '${tagId}' not found`);
    }
    
    // Get articles with this tag
    const result = await articleRepository.findByTag(tagId);
    return result.data;
  }

  async cleanupUnusedTags(): Promise<number> {
    return tagRepository.cleanupUnusedTags();
  }

  async searchByName(searchTerm: string, limit: number = 10): Promise<Tag[]> {
    return tagRepository.searchByName(searchTerm, limit);
  }

  async getPopular(limit: number = 10): Promise<Tag[]> {
    return tagRepository.findPopular(limit);
  }
}

export const tagService = new TagServiceImpl();