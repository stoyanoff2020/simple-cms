import * as fs from 'fs';
import * as path from 'path';
import { db } from './connection';

export class DatabaseMigrator {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async createMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await db.query(createTableQuery);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await db.query('SELECT filename FROM migrations ORDER BY id');
    return result.rows.map((row: any) => row.filename);
  }

  async getMigrationFiles(): Promise<string[]> {
    const files = fs.readdirSync(this.migrationsPath);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  async executeMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`Executing migration: ${filename}`);
    
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${filename} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error executing migration ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    try {
      console.log('Starting database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get list of executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      
      // Get list of migration files
      const migrationFiles = await this.getMigrationFiles();
      
      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations found');
        return;
      }
      
      console.log(`Found ${pendingMigrations.length} pending migrations`);
      
      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async rollbackLastMigration(): Promise<void> {
    const result = await db.query(
      'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = result.rows[0].filename;
    console.log(`Rolling back migration: ${lastMigration}`);
    
    // Remove from migrations table
    await db.query('DELETE FROM migrations WHERE filename = $1', [lastMigration]);
    
    console.log(`Migration ${lastMigration} rolled back`);
    console.log('Note: You may need to manually undo schema changes');
  }
}

export const migrator = new DatabaseMigrator();