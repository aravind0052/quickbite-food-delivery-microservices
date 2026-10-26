process.env.NODE_ENV = 'test';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { io as ClientIO } from 'socket.io-client';
import { server, app } from './index.js';
import config from './config/services.js';
import { clearRateLimitRecords } from './middleware/rateLimiter.middleware.js';

const GATEWAY_TEST_PORT = 4099;
const MOCK_AUTH_PORT = 3191;
const MOCK_USER_PORT = 3192;
const MOCK_RESTAURANT_PORT = 3193;
const MOCK_ORDER_PORT = 3194;

let mockAuthServer: http.Server;
let mockUserServer: http.Server;
let mockRestaurantServer: http.Server;
let mockOrderServer: http.Server;

// Track forwarded headers on mock services
let lastForwardedHeaders: Record<string, string | string[] | undefined> = {};

function startMockServices(): Promise<void> {
  return new Promise((resolve) => {
    // 1. Mock Auth Service
    const authApp = express();
    authApp.use(express.json());
    authApp.get('/health', (_req, res) => res.json({ service: 'auth-service', status: 'UP' }));
    authApp.post('/auth/login', (_req, res) => res.json({ success: true, message: 'Mock Login' }));
    mockAuthServer = authApp.listen(MOCK_AUTH_PORT);

    // 2. Mock User Service
    const userApp = express();
    userApp.use(express.json());
    userApp.get('/health', (_req, res) => res.json({ service: 'user-service', status: 'UP' }));
    userApp.get('/users/me', (req, res) => {
      lastForwardedHeaders = req.headers;
      res.json({ success: true, userId: req.headers['x-user-id'] });
    });
    mockUserServer = userApp.listen(MOCK_USER_PORT);

    // 3. Mock Restaurant Service
    const restApp = express();
    restApp.use(express.json());
    restApp.get('/health', (_req, res) => res.json({ service: 'restaurant-service', status: 'UP' }));
    restApp.get('/restaurants', (_req, res) => res.json({ success: true, data: [{ id: 1, name: 'Mock Rest' }] }));
    mockRestaurantServer = restApp.listen(MOCK_RESTAURANT_PORT);

    // 4. Mock Order Service
    const orderApp = express();
    orderApp.use(express.json());
    orderApp.get('/health', (_req, res) => res.json({ service: 'order-service', status: 'UP' }));
    orderApp.get('/orders/my-orders', (req, res) => {
      lastForwardedHeaders = req.headers;
      res.json({ success: true, orders: [{ id: 101 }], userId: req.headers['x-user-id'] });
    });
    mockOrderServer = orderApp.listen(MOCK_ORDER_PORT, () => {
      resolve();
    });
  });
}

async function runGatewayTests() {
  console.log('[Gateway Test] Initializing test suite...');

  // Configure gateway to point to mock services
  config.services.auth = `http://localhost:${MOCK_AUTH_PORT}`;
  config.services.user = `http://localhost:${MOCK_USER_PORT}`;
  config.services.restaurant = `http://localhost:${MOCK_RESTAURANT_PORT}`;
  config.services.order = `http://localhost:${MOCK_ORDER_PORT}`;

  await startMockServices();
  console.log('✔ Mock microservices initialized');

  server.listen(GATEWAY_TEST_PORT);
  console.log(`✔ API Gateway listening on test port ${GATEWAY_TEST_PORT}`);

  const baseUrl = `http://localhost:${GATEWAY_TEST_PORT}`;

  try {
    // 1. Health check
    console.log('\n--- 1. Testing Gateway GET /health ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData: any = await healthRes.json();
    console.log('Health response:', healthData);
    if (healthRes.status !== 200 || healthData.status !== 'UP' || healthData.service !== 'api-gateway') {
      throw new Error('Gateway health check failed!');
    }
    console.log('✔ Gateway health check passed');

    // 2. Request ID & Timing Headers
    console.log('\n--- 2. Testing X-Request-ID Generation ---');
    const reqIdRes = await fetch(`${baseUrl}/health`);
    const xReqId = reqIdRes.headers.get('x-request-id');
    console.log('X-Request-ID Header:', xReqId);
    if (!xReqId || !xReqId.startsWith('req_')) {
      throw new Error(`Invalid X-Request-ID header: ${xReqId}`);
    }
    console.log('✔ Unique X-Request-ID header confirmed');

    // 3. Public Route Access & Reverse Proxy
    console.log('\n--- 3. Testing Reverse Proxy: Public GET /api/restaurants ---');
    const restRes = await fetch(`${baseUrl}/api/restaurants`);
    const restData: any = await restRes.json();
    console.log('Proxy response status:', restRes.status, restData);
    if (restRes.status !== 200 || !restData.success) {
      throw new Error('Reverse proxy to restaurant service failed!');
    }
    console.log('✔ Reverse proxy forward to restaurant service succeeded');

    // 4. Protected Route without JWT (Must be 401)
    console.log('\n--- 4. Testing Protected Route without JWT (Should be 401) ---');
    const unauthRes = await fetch(`${baseUrl}/api/orders/my-orders`);
    const unauthData: any = await unauthRes.json();
    console.log('Unauth status:', unauthRes.status, unauthData);
    if (unauthRes.status !== 401 || unauthData.success !== false) {
      throw new Error('Missing JWT on protected route must return 401 Unauthorized!');
    }
    console.log('✔ Missing JWT correctly blocked with 401 Unauthorized');

    // 5. Protected Route with Invalid JWT (Must be 401)
    console.log('\n--- 5. Testing Protected Route with Invalid JWT (Should be 401) ---');
    const invalidJwtRes = await fetch(`${baseUrl}/api/orders/my-orders`, {
      headers: { Authorization: 'Bearer this_is_a_completely_fake_token' },
    });
    const invalidJwtData: any = await invalidJwtRes.json();
    console.log('Invalid JWT status:', invalidJwtRes.status, invalidJwtData);
    if (invalidJwtRes.status !== 401 || invalidJwtData.success !== false) {
      throw new Error('Invalid JWT must return 401 Unauthorized!');
    }
    console.log('✔ Invalid JWT rejected with 401 Unauthorized');

    // 6. Protected Route with Valid JWT & Identity Forwarding
    console.log('\n--- 6. Testing Protected Route with Valid JWT & Identity Forwarding ---');
    const validToken = jwt.sign(
      { userId: 88, email: 'tester88@quickbite.demo', role: 'CUSTOMER' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const validRes = await fetch(`${baseUrl}/api/orders/my-orders`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const validData: any = await validRes.json();
    console.log('Valid request status:', validRes.status, validData);
    if (validRes.status !== 200 || !validData.success) {
      throw new Error('Valid JWT request failed!');
    }
    // Check forwarded headers
    console.log('Forwarded headers on mock service:', {
      'x-user-id': lastForwardedHeaders['x-user-id'],
      'x-user-email': lastForwardedHeaders['x-user-email'],
      'x-user-role': lastForwardedHeaders['x-user-role'],
      'x-request-id': lastForwardedHeaders['x-request-id'],
    });
    if (lastForwardedHeaders['x-user-id'] !== '88' || lastForwardedHeaders['x-user-role'] !== 'CUSTOMER') {
      throw new Error('Gateway failed to forward user identity headers!');
    }
    console.log('✔ JWT verified and identity headers (x-user-id, x-user-email, x-user-role) forwarded to microservice');

    // 7. Multi-Service Health Monitoring
    console.log('\n--- 7. Testing GET /api/gateway/services-health ---');
    const servicesHealthRes = await fetch(`${baseUrl}/api/gateway/services-health`);
    const servicesHealthData: any = await servicesHealthRes.json();
    console.log('Services health status:', servicesHealthData.overallStatus, servicesHealthData.services);
    if (servicesHealthRes.status !== 200 || servicesHealthData.overallStatus !== 'HEALTHY') {
      throw new Error('Services health check failed!');
    }
    console.log('✔ Multi-service health monitoring passed (All 4 services ONLINE)');

    // 8. Rate Limiting Test (Send 15 requests rapidly when limit is 10)
    console.log('\n--- 8. Testing Fixed-Window Rate Limiter (Exceed limit of 10) ---');
    clearRateLimitRecords();
    let hit429 = false;
    let lastLimitHeaders = {};

    for (let i = 1; i <= 15; i++) {
      const res = await fetch(`${baseUrl}/api/restaurants`);
      lastLimitHeaders = {
        limit: res.headers.get('x-ratelimit-limit'),
        remaining: res.headers.get('x-ratelimit-remaining'),
        reset: res.headers.get('x-ratelimit-reset'),
      };
      if (res.status === 429) {
        hit429 = true;
        console.log(`Request #${i} returned 429 Rate Limited as expected:`, lastLimitHeaders);
        break;
      }
    }

    if (!hit429) {
      throw new Error('Rate limiter failed to block requests after exceeding limit!');
    }
    console.log('✔ Custom rate limiter successfully returned 429 Too Many Requests with X-RateLimit headers');

    // 9. Socket.IO Live Monitoring Stream Test
    console.log('\n--- 9. Testing Socket.IO Live Monitoring Stream ---');
    const socket = ClientIO(`http://localhost:${GATEWAY_TEST_PORT}`);
    let receivedSnapshot = false;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Socket.IO connection timeout!')), 4000);

      socket.on('connect', () => {
        console.log('Connected to Gateway Socket.IO server:', socket.id);
      });

      socket.on('metrics_snapshot', (snapshot) => {
        console.log('Received live metrics snapshot via Socket.IO:', {
          totalRequests: snapshot.totalRequests,
          successRequests: snapshot.successRequests,
          rateLimitedRequests: snapshot.rateLimitedRequests,
        });
        receivedSnapshot = true;
        clearTimeout(timer);
        resolve();
      });
    });

    socket.disconnect();
    if (!receivedSnapshot) {
      throw new Error('Did not receive live Socket.IO metrics snapshot!');
    }
    console.log('✔ Socket.IO real-time monitoring connection and event streaming verified');

    console.log('\n========================================');
    console.log('ALL API GATEWAY TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (error) {
    console.error('[Gateway Test ERROR]:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    mockAuthServer?.close();
    mockUserServer?.close();
    mockRestaurantServer?.close();
    mockOrderServer?.close();
    process.exit(process.exitCode || 0);
  }
}

runGatewayTests();
