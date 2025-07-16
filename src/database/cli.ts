#!/usr/bin/env ts-node

import { migrator } from './migrator';
import { seeder } from './seeder';
import { db } from './connection';

async function main() {
  const command = process.argv[2];
  const environment = process.argv[3] || 'development';

  try {
    switch (command) {
      case 'migrate':
        await migrator.runMigrations();
        break;
      
      case 'seed':
        await seeder.runSeeds(environment);
        break;
      
      case 'reset':
        await seeder.clearDatabase();
        await migrator.runMigrations();
        await seeder.runSeeds(environment);
        break;
      
      case 'rollback':
        await migrator.rollbackLastMigration();
        break;
      
      case 'clear':
        await seeder.clearDatabase();
        break;
      
      default:
        console.log('Usage: ts-node src/database/cli.ts <command> [environment]');
        console.log('Commands:');
        console.log('  migrate   - Run pending migrations');
        console.log('  seed      - Run seed data for specified environment (default: development)');
        console.log('  reset     - Clear database, run migrations, and seed data');
        console.log('  rollback  - Rollback the last migration');
        console.log('  clear     - Clear all database tables');
        process.exit(1);
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  main();
}