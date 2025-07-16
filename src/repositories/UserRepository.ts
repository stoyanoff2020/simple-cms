import * as bcrypt from 'bcrypt';
import { db } from '../database/connection';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/User';

export class UserRepository {
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async create(userData: CreateUserRequest): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    
    const query = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, password_hash, role, created_at, updated_at
    `;
    
    const values = [
      userData.username,
      userData.email,
      hashedPassword,
      userData.role || 'author'
    ];
    
    const result = await db.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    
    const result = await db.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE username = $1
    `;
    
    const result = await db.query(query, [username]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async update(id: string, updates: UpdateUserRequest): Promise<User | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.username !== undefined) {
      setClause.push(`username = $${paramCount++}`);
      values.push(updates.username);
    }

    if (updates.email !== undefined) {
      setClause.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }

    if (updates.role !== undefined) {
      setClause.push(`role = $${paramCount++}`);
      values.push(updates.role);
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, password_hash, role, created_at, updated_at
    `;

    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await this.hashPassword(newPassword);
    
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    const result = await db.query(query, [hashedPassword, id]);
    return result.rowCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  async findAll(): Promise<User[]> {
    const query = `
      SELECT id, username, email, password_hash, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    const result = await db.query(query);
    return result.rows.map((row: any) => this.mapRowToUser(row));
  }

  async existsByEmail(email: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows.length > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    return result.rows.length > 0;
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const userRepository = new UserRepository();