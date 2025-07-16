// Simple integration test for authentication endpoints
const request = require('supertest');
const express = require('express');

// Mock the database connection
jest.mock('./src/database/connection');

// Import the app
const app = require('./src/index').default;

describe('Authentication Integration Test', () => {
  test('Complete authentication flow', async () => {
    // Test registration
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'author'
      });

    console.log('Registration response:', registerResponse.status, registerResponse.body);

    // Test login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    console.log('Login response:', loginResponse.status, loginResponse.body);

    // Test token verification
    if (loginResponse.body.token) {
      const verifyResponse = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      console.log('Verify response:', verifyResponse.status, verifyResponse.body);
    }

    // Test password reset
    const resetResponse = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'test@example.com'
      });

    console.log('Reset response:', resetResponse.status, resetResponse.body);
  });
});