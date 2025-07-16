import { initTestDb, cleanTestDb, closeTestDb } from './database/test-config';

// Global setup - runs once before all tests
export const setup = async (): Promise<void> => {
  try {
    // Set environment to test
    process.env.NODE_ENV = 'test';
    
    // Initialize test database with schema
    await initTestDb();
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
};

// Global teardown - runs once after all tests
export const teardown = async (): Promise<void> => {
  try {
    // Close database connection
    await closeTestDb();
  } catch (error) {
    console.error('Test teardown failed:', error);
    throw error;
  }
};

// Before each test
beforeEach(async () => {
  // Clean database before each test
  await cleanTestDb();
});

// After all tests
afterAll(async () => {
  // Close database connection
  await closeTestDb();
});