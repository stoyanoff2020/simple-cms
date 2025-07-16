import { CategoryRepository } from '../CategoryRepository';
import { db } from '../../database/connection';
import { CreateCategoryRequest } from '../../models/Category';

// Mock the database connection
jest.mock('../../database/connection');

describe('CategoryRepository', () => {
  let categoryRepository: CategoryRepository;
  let mockQuery: jest.Mock;
  let mockGetClient: jest.Mock;
  let mockClient: any;

  beforeEach(() => {
    categoryRepository = new CategoryRepository();
    mockQuery = jest.fn();
    mockGetClient = jest.fn();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    (db as any).query = mockQuery;
    (db as any).getClient = mockGetClient;
    mockGetClient.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new category with generated slug', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'Web Development',
        description: 'Articles about web development'
      };

      const mockResult = {
        rows: [{
          id: '123',
          name: 'Web Development',
          description: 'Articles about web development',
          slug: 'web-development',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await categoryRepository.create(categoryData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        expect.arrayContaining([
          categoryData.name,
          categoryData.description,
          'web-development'
        ])
      );

      expect(result).toEqual({
        id: '123',
        name: 'Web Development',
        description: 'Articles about web development',
        slug: 'web-development',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should generate slug from name', async () => {
      const categoryData: CreateCategoryRequest = {
        name: 'JavaScript & Node.js!'
      };

      const mockResult = {
        rows: [{
          id: '123',
          name: 'JavaScript & Node.js!',
          description: null,
          slug: 'javascript-node-js',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await categoryRepository.create(categoryData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        expect.arrayContaining([
          categoryData.name,
          null,
          'javascript-node-js'
        ])
      );
    });
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      const mockResult = {
        rows: [{
          id: '123',
          name: 'Technology',
          description: 'Tech articles',
          slug: 'technology',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await categoryRepository.findById('123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123']
      );

      expect(result).toEqual({
        id: '123',
        name: 'Technology',
        description: 'Tech articles',
        slug: 'technology',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should return null when category not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await categoryRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete category and remove associations', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // DELETE associations
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE category
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await categoryRepository.delete('123');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM article_categories WHERE category_id = $1',
        ['123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM categories WHERE id = $1',
        ['123']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});