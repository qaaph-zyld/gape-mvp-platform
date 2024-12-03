import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_duration{staticAsset:yes}': ['p(95)<100'], // 95% of static asset requests must complete below 100ms
    errors: ['rate<0.1'],  // Error rate must be less than 10%
  },
};

// Test setup
export function setup() {
  const loginRes = http.post('http://localhost:4000/api/auth/login', {
    username: 'testuser',
    password: 'testpass',
  });
  
  return {
    token: loginRes.json('token'),
  };
}

// Main test function
export default function(data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  // Group 1: API Endpoints
  {
    // GET request
    const getRes = http.get('http://localhost:4000/api/data', params);
    check(getRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    // POST request
    const postRes = http.post('http://localhost:4000/api/data',
      JSON.stringify({ key: 'value' }),
      params
    );
    check(postRes, {
      'status is 201': (r) => r.status === 201,
      'response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);

    sleep(1);
  }

  // Group 2: Static Assets
  {
    const staticRes = http.get('http://localhost:3000/static/main.js', {
      tags: { staticAsset: 'yes' },
    });
    check(staticRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 100ms': (r) => r.timings.duration < 100,
    }) || errorRate.add(1);
  }

  // Group 3: Complex Operations
  {
    const searchRes = http.post('http://localhost:4000/api/search',
      JSON.stringify({
        query: 'test',
        filters: {
          date: 'last_week',
          category: 'test',
        },
      }),
      params
    );
    check(searchRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
      'has results': (r) => r.json('results').length > 0,
    }) || errorRate.add(1);

    sleep(2);
  }
}

// Test teardown
export function teardown(data) {
  http.post('http://localhost:4000/api/auth/logout', {}, {
    headers: {
      'Authorization': `Bearer ${data.token}`,
    },
  });
}
