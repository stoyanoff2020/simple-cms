import { db } from '../database/connection';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../models/Category';

export class CategoryRepository {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(categoryData: CreateCategoryRequest): Promise<Category> {
    const slug = this.generateSlug(categoryData.name);
    
    const query = `
      INSERT INTO categories (name, description, slug)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, slug, created_at, updated_at
    `;
    
    const values = [
      categoryData.name,
      categoryData.description || null,
      slug
    ];
    
    const result = await db.query(query, values);
    return this.mapRowToCategory(result.rows[0]);
  }

  async findById(id: string): Promise<Category | null> {
    const query = `
      SELECT id, name, description, slug, created_at, updated_at
      FROM categories
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCategory(result.rows[0]);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const query = `
      SELECT id, name, description, slug, created_at, updated_at
      FROM categories
      WHERE slug = $1
    `;
    
    const result = await db.query(query, [slug]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCategory(result.rows[0]);
  }

  async findByName(name: string): Promise<Category | null> {
    const query = `
      SELECT id, name, description, slug, created_at, updated_at
      FROM categories
      WHERE name = $1
    `;
    
    const result = await db.query(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCategory(result.rows[0]);
  }

  async update(id: string, updates: UpdateCategoryRequest): Promise<Category | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
      
      // Update slug when name changes
      setClause.push(`slug = $${paramCount++}`);
      values.push(this.generateSlug(updates.name));
    }

    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE categories
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, description, slug, created_at, updated_at
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCategory(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Remove category associations from articles
      await client.query('DELETE FROM article_categories WHERE category_id = $1', [id]);
      
      // Delete the category
      const result = await client.query('DELETE FROM categories WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return (result.rowCount || 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAll(): Promise<Category[]> {
    const query = `
      SELECT id, name, description, slug, created_at, updated_at
      FROM categories
      ORDER BY name ASC
    `;
    
    const result = await db.query(query);
    return result.rows.map((row: any) => this.mapRowToCategory(row));
  }

  async findWithArticleCount(): Promise<(Category & { articleCount: number })[]> {
    const query = `
      SELECT 
        c.id, c.name, c.description, c.slug, c.created_at, c.updated_at,
        COUNT(ac.article_id) as article_count
      FROM categories c
      LEFT JOIN article_categories ac ON c.id = ac.category_id
      LEFT JOIN articles a ON ac.article_id = a.id AND a.status = 'published'
      GROUP BY c.id, c.name, c.description, c.slug, c.created_at, c.updated_at
      ORDER BY c.name ASC
    `;
    
    const result = await db.query(query);
    return result.rows.map((row: any) => ({
      ...this.mapRowToCategory(row),
      articleCount: parseInt(row.article_count)
    }));
  }

  async existsByName(name: string): Promise<boolean> {
    const query = 'SELECT 1 FROM categories WHERE name = $1';
    const result = await db.query(query, [name]);
    return result.rows.length > 0;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const query = 'SELECT 1 FROM categories WHERE slug = $1';
    const result = await db.query(query, [slug]);
    return result.rows.length > 0;
  }

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      slug: row.slug,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const categoryRepository = new CategoryRepository();