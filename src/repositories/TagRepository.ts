import { db } from '../database/connection';
import { Tag, CreateTagRequest } from '../models/Tag';

export class TagRepository {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(tagData: CreateTagRequest): Promise<Tag> {
    const slug = this.generateSlug(tagData.name);
    
    const query = `
      INSERT INTO tags (name, slug, usage_count)
      VALUES ($1, $2, 0)
      RETURNING id, name, slug, usage_count, created_at
    `;
    
    const values = [tagData.name, slug];
    
    const result = await db.query(query, values);
    return this.mapRowToTag(result.rows[0]);
  }

  async findById(id: string): Promise<Tag | null> {
    const query = `
      SELECT id, name, slug, usage_count, created_at
      FROM tags
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTag(result.rows[0]);
  }

  async findByName(name: string): Promise<Tag | null> {
    const query = `
      SELECT id, name, slug, usage_count, created_at
      FROM tags
      WHERE name = $1
    `;
    
    const result = await db.query(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTag(result.rows[0]);
  }

  async findBySlug(slug: string): Promise<Tag | null> {
    const query = `
      SELECT id, name, slug, usage_count, created_at
      FROM tags
      WHERE slug = $1
    `;
    
    const result = await db.query(query, [slug]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTag(result.rows[0]);
  }

  async findOrCreate(name: string): Promise<Tag> {
    // First try to find existing tag
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }
    
    // Create new tag if it doesn't exist
    return this.create({ name });
  }

  async findAll(): Promise<Tag[]> {
    const query = `
      SELECT id, name, slug, usage_count, created_at
      FROM tags
      ORDER BY usage_count DESC, name ASC
    `;
    
    const result = await db.query(query);
    return result.rows.map((row: any) => this.mapRowToTag(row));
  }

  async findPopular(limit: number = 10): Promise<Tag[]> {
    const query = `
      SELECT id, name, slug, usage_count, created_at
      FROM tags
      WHERE usage_count > 0
      ORDER BY usage_count DESC, name ASC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    return result.rows.map((row: any) => this.mapRowToTag(row));
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) {
      return [];
    }
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      SELECT id, name, slug, usage_count, created_at
      FROM tags
      WHERE id IN (${placeholders})
      ORDER BY name ASC
    `;
    
    const result = await db.query(query, ids);
    return result.rows.map((row: any) => this.mapRowToTag(row));
  }

  async incrementUsageCount(id: string): Promise<void> {
    const query = 'UPDATE tags SET usage_count = usage_count + 1 WHERE id = $1';
    await db.query(query, [id]);
  }

  async decrementUsageCount(id: string): Promise<void> {
    const query = 'UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = $1';
    await db.query(query, [id]);
  }

  async updateUsageCount(id: string, count: number): Promise<void> {
    const query = 'UPDATE tags SET usage_count = $1 WHERE id = $2';
    await db.query(query, [Math.max(0, count), id]);
  }

  async cleanupUnusedTags(): Promise<number> {
    const query = 'DELETE FROM tags WHERE usage_count = 0';
    const result = await db.query(query);
    return result.rowCount || 0;
  }

  async delete(id: string): Promise<boolean> {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Remove tag associations from articles
      await client.query('DELETE FROM article_tags WHERE tag_id = $1', [id]);
      
      // Delete the tag
      const result = await client.query('DELETE FROM tags WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      return (result.rowCount || 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async searchByName(searchTerm: string, limit: number = 10): Promise<Tag[]> {
    const query = `
      SELECT id, name, slug, usage_count, created_at
      FROM tags
      WHERE name ILIKE $1
      ORDER BY usage_count DESC, name ASC
      LIMIT $2
    `;
    
    const result = await db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows.map((row: any) => this.mapRowToTag(row));
  }

  async existsByName(name: string): Promise<boolean> {
    const query = 'SELECT 1 FROM tags WHERE name = $1';
    const result = await db.query(query, [name]);
    return result.rows.length > 0;
  }

  private mapRowToTag(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      usageCount: parseInt(row.usage_count),
      createdAt: new Date(row.created_at)
    };
  }
}

export const tagRepository = new TagRepository();