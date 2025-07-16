import { Category, CreateCategoryRequest, UpdateCategoryRequest, Article } from '../models';
import { categoryRepository } from '../repositories/CategoryRepository';
import { articleRepository } from '../repositories/ArticleRepository';

export interface CategoryService {
  create(categoryData: CreateCategoryRequest): Promise<Category>;
  update(id: string, updates: UpdateCategoryRequest): Promise<Category>;
  delete(id: string): Promise<void>;
  getAll(): Promise<Category[]>;
  getById(id: string): Promise<Category | null>;
  getArticlesByCategory(categoryId: string): Promise<Article[]>;
}

export class CategoryServiceImpl implements CategoryService {
  async create(categoryData: CreateCategoryRequest): Promise<Category> {
    // Check if category with same name already exists
    const existingCategory = await categoryRepository.findByName(categoryData.name);
    if (existingCategory) {
      throw new Error(`Category with name '${categoryData.name}' already exists`);
    }
    
    return categoryRepository.create(categoryData);
  }

  async update(id: string, updates: UpdateCategoryRequest): Promise<Category> {
    // Check if category exists
    const existingCategory = await categoryRepository.findById(id);
    if (!existingCategory) {
      throw new Error(`Category with id '${id}' not found`);
    }
    
    // Check if name is being updated and if it would conflict
    if (updates.name && updates.name !== existingCategory.name) {
      const nameExists = await categoryRepository.existsByName(updates.name);
      if (nameExists) {
        throw new Error(`Category with name '${updates.name}' already exists`);
      }
    }
    
    const updatedCategory = await categoryRepository.update(id, updates);
    if (!updatedCategory) {
      throw new Error(`Failed to update category with id '${id}'`);
    }
    
    return updatedCategory;
  }

  async delete(id: string): Promise<void> {
    // Check if category exists
    const existingCategory = await categoryRepository.findById(id);
    if (!existingCategory) {
      throw new Error(`Category with id '${id}' not found`);
    }
    
    const deleted = await categoryRepository.delete(id);
    if (!deleted) {
      throw new Error(`Failed to delete category with id '${id}'`);
    }
  }

  async getAll(): Promise<Category[]> {
    return categoryRepository.findAll();
  }

  async getById(id: string): Promise<Category | null> {
    return categoryRepository.findById(id);
  }

  async getArticlesByCategory(categoryId: string): Promise<Article[]> {
    // Check if category exists
    const existingCategory = await categoryRepository.findById(categoryId);
    if (!existingCategory) {
      throw new Error(`Category with id '${categoryId}' not found`);
    }
    
    return articleRepository.findByCategoryId(categoryId);
  }
}

export const categoryService = new CategoryServiceImpl();