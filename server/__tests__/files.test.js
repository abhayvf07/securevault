const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = require('../app');

let accessToken;

/**
 * Files API Tests
 * Tests pagination and the health endpoint.
 */

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Login to get a token
  const testUser = {
    name: 'FileTest User',
    email: `filetest_${Date.now()}@example.com`,
    password: 'Test@1234',
  };

  // Register test user
  const regRes = await request(app)
    .post('/api/auth/register')
    .send(testUser);

  accessToken = regRes.body.data.token;

  // Store email for cleanup
  global.__fileTestEmail = testUser.email;
});

afterAll(async () => {
  // Cleanup
  const User = require('../models/User');
  await User.deleteOne({ email: global.__fileTestEmail });
  await mongoose.connection.close();
});

describe('Files API', () => {
  // Test 1: Health check
  test('GET /api/health — should return success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('running');
  });

  // Test 2: Get files with pagination
  test('GET /api/files — should return paginated results', async () => {
    const res = await request(app)
      .get('/api/files?page=1&limit=5')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(5);
    expect(res.body.data.pagination).toHaveProperty('total');
    expect(res.body.data.pagination).toHaveProperty('totalPages');
  });

  // Test 3: Get files without auth should fail
  test('GET /api/files — should reject without token', async () => {
    const res = await request(app).get('/api/files');
    expect(res.status).toBe(401);
  });

  // Test 4: 404 for unknown routes
  test('GET /api/unknown — should return 404', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
