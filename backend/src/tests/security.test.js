const request = require('supertest');
const app = require('../index');
const { connectDB, closeDB } = require('../config/database');

describe('Security Features', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  describe('Security Headers', () => {
    it('should have security headers set', async () => {
      const response = await request(app).get('/');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });
      
      expect(response.status).toBe(403);
    });
  });

  describe('XSS Protection', () => {
    it('should sanitize input containing XSS attacks', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>',
        email: 'test@test.com'
      };

      const response = await request(app)
        .post('/api/users')
        .send(maliciousInput);

      expect(response.body.name).not.toContain('<script>');
    });
  });

  describe('MongoDB Injection Protection', () => {
    it('should prevent MongoDB injection attacks', async () => {
      const maliciousQuery = { email: { $gt: '' } };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousQuery);

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit repeated requests from same IP', async () => {
      const requests = Array(101).fill().map(() => 
        request(app).get('/api/users')
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);
      
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Session Management', () => {
    it('should set secure session cookie in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' });

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('Secure');
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Strict');
    });
  });
});
