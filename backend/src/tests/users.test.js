const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const User = require('../models/User');

let mongoServer;
let token;
let userId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  
  // Create a test user and get token
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
  
  token = res.body.token;
  userId = res.body.user.id;
});

describe('User Profile Endpoints', () => {
  describe('GET /api/users/profile', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('email', 'test@example.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should not get profile without token', async () => {
      const res = await request(app)
        .get('/api/users/profile');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          email: 'updated@example.com',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Name');
      expect(res.body).toHaveProperty('email', 'updated@example.com');
    });

    it('should not update profile with invalid email', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'invalid-email',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('DELETE /api/users/profile', () => {
    it('should delete user account', async () => {
      const res = await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'User account deleted successfully');

      // Verify user is deleted
      const user = await User.findById(userId);
      expect(user).toBeNull();
    });
  });
});
