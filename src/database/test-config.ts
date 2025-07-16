import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Test database configuration
export const testDbConfig: PoolConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'simple_cms_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  ssl: process.env.TEST_DB_SSL === 'true' ? true : false
};

// Create a test database pool
export const testPool = new Pool(testDbConfig);

/**
 * Initialize test database
 * This function sets up the test database with required schema
 */
export const initTestDb = async (): Promise<void> => {
  try {
    // Run migrations on test database
    const { runMigrations } = require('./migrator');
    await runMigrations(testPool);
    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
};

/**
 * Clean test database
 * This function truncates all tables in the test database
 */
export const cleanTestDb = async (): Promise<void> => {
  try {
    // Get all tables
    const tablesResult = await testPool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND 
      tablename NOT IN ('pg_stat_statements')
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    
    if (tables.length > 0) {
      // Disable triggers and truncate all tables
      await testPool.query(`
        DO $$
        BEGIN
          EXECUTE 'SET session_replication_role = replica;';
          ${tables.map(table => `EXECUTE 'TRUNCATE TABLE "${table}" CASCADE;';`).join('\n')}
          EXECUTE 'SET session_replication_role = DEFAULT;';
        END $$;
      `);
      console.log('Test database cleaned successfully');
    }
  } catch (error) {
    console.error('Failed to clean test database:', error);
    throw error;
  }
};

/**
 * Seed test database with test data
 * @param seedFile Path to SQL seed file
 */
export const seedTestDb = async (seedFile: string): Promise<void> => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Read seed file
    const seedPath = path.resolve(__dirname, seedFile);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    
    // Execute seed SQL
    await testPool.query(seedSql);
    console.log(`Test database seeded with ${seedFile}`);
  } catch (error) {
    console.error('Failed to seed test database:', error);
    throw error;
  }
};

/**
 * Close test database connection
 */
export const closeTestDb = async (): Promise<void> => {
  try {
    await testPool.end();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Failed to close test database connection:', error);
  }
};