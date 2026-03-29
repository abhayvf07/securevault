const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = require('../app');

// Test user data
const testUser = {
  name: 'Test User',
  email: `testuser_${Date.now()}@example.com`,
  password: 'Test@1234',
};

let accessToken;

/**
 * Auth API Tests
 * Tests the core authentication flow:
 * 1. Register a new user
 * 2. Login with credentials
 * 3. Access protected route with token
 * 4. Reject access without token
 */

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  // Cleanup: delete the test user
  const User = require('../models/User');
  await User.deleteOne({ email: testUser.email });

  const RefreshToken = require('../models/RefreshToken');
  await RefreshToken.deleteMany({});

  await mongoose.connection.close();
});

describe('Auth API', () => {
  // Test 1: Register
  test('POST /api/auth/register — should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.token).toBeDefined();
  });

  // Test 2: Login
  test('POST /api/auth/login — should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();

    accessToken = res.body.data.token;
  });

  // Test 3: Protected route WITH token
  test('GET /api/auth/me — should return user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  // Test 4: Protected route WITHOUT token
  test('GET /api/auth/me — should reject without token', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Test 5: Login with wrong password
  test('POST /api/auth/login — should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword@1',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
