import fs from 'fs';
import path from 'path';
import { db } from './connection';

class Seeder {
  /**
   * Seed database with data from SQL file
   * @param seedFile Name of the seed file in the seeds directory
   */
  async runSeeds(environment: string = 'development'): Promise<void> {
    try {
      const seedFile = `${environment}.sql`;
      // Read seed file
      const seedPath = path.join(__dirname, 'seeds', seedFile);
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      
      // Execute seed SQL
      await db.query(seedSql);
      console.log(`Database seeded with ${seedFile}`);
    } catch (error) {
      console.error('Failed to seed database:', error);
      throw error;
    }
  }

  /**
   * Clear all tables in the database
   */
  async clearDatabase(): Promise<void> {
    try {
      // Get all tables
      const tablesResult = await db.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND 
        tablename NOT IN ('pg_stat_statements')
      `);
      
      const tables = tablesResult.rows.map((row: any) => row.tablename);
      
      if (tables.length > 0) {
        // Disable triggers and truncate all tables
        await db.query(`
          DO $
          BEGIN
            EXECUTE 'SET session_replication_role = replica;';
            ${tables.map((table: string) => `EXECUTE 'TRUNCATE TABLE "${table}" CASCADE;';`).join('\n')}
            EXECUTE 'SET session_replication_role = DEFAULT;';
          END $;
        `);
        console.log('Database cleared successfully');
      }
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw error;
    }
  }
}

export const seeder = new Seeder();

/**
 * Run seeder from command line
 */
if (require.main === module) {
  const environment = process.argv[2] || 'development';
  
  seeder.runSeeds(environment)
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}