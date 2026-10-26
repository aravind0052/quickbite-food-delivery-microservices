process.env.NODE_ENV = 'test';
import app from './index.js';
import { pool } from './db.js';
import jwt from 'jsonwebtoken';
import http from 'http';

const PORT = 3099;
let server: http.Server;

async function runTests() {
  console.log('[Auth Service Test] Starting integration tests...');
  server = app.listen(PORT);

  const baseUrl = `http://localhost:${PORT}`;

  try {
    // 1. Test Health Check
    console.log('\n--- 1. Testing GET /health ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData: any = await healthRes.json();
    console.log('Health response:', healthData);
    if (healthRes.status !== 200 || healthData.status !== 'UP' || healthData.database !== 'CONNECTED') {
      throw new Error(`Health check failed! Status: ${healthRes.status}, data: ${JSON.stringify(healthData)}`);
    }
    console.log('✔ Health check passed (Database CONNECTED)');

    // 2. Test Login with Seeded Demo Account
    console.log('\n--- 2. Testing POST /auth/login (Valid credentials) ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer01@quickbite.demo',
        password: 'QuickBite@123',
      }),
    });
    const loginData: any = await loginRes.json();
    console.log('Login response status:', loginRes.status);
    console.log('User logged in:', loginData.user);
    if (loginRes.status !== 200 || !loginData.success || !loginData.token) {
      throw new Error(`Valid login failed! Status: ${loginRes.status}, data: ${JSON.stringify(loginData)}`);
    }

    // Verify JWT
    const decoded: any = jwt.verify(loginData.token, process.env.JWT_SECRET || 'quickbite_super_secret_jwt_key_2026_academic');
    console.log('Decoded JWT payload:', decoded);
    if (decoded.email !== 'customer01@quickbite.demo' || decoded.role !== 'CUSTOMER') {
      throw new Error('JWT payload mismatch!');
    }
    console.log('✔ Login with valid credentials and JWT generation passed');

    // 3. Test Login with Invalid Password
    console.log('\n--- 3. Testing POST /auth/login (Invalid credentials) ---');
    const invalidLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'customer01@quickbite.demo',
        password: 'WrongPassword!999',
      }),
    });
    const invalidLoginData: any = await invalidLoginRes.json();
    console.log('Invalid login status:', invalidLoginRes.status, invalidLoginData);
    if (invalidLoginRes.status !== 401 || invalidLoginData.success !== false) {
      throw new Error('Invalid login should return 401 Unauthorized!');
    }
    console.log('✔ Invalid credentials rejected with 401 Unauthorized');

    // 4. Test Registration with New Account
    console.log('\n--- 4. Testing POST /auth/register (New Customer) ---');
    const testEmail = `autotest_${Date.now()}@quickbite.demo`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Test User',
        email: testEmail,
        phone: '+91 99999 88888',
        password: 'TestPassword@123',
        role: 'CUSTOMER',
      }),
    });
    const regData: any = await regRes.json();
    console.log('Register response status:', regRes.status, regData);
    if (regRes.status !== 201 || !regData.success || !regData.token) {
      throw new Error(`Registration failed! Status: ${regRes.status}, data: ${JSON.stringify(regData)}`);
    }
    console.log('✔ User registration succeeded with 201 Created');

    // 5. Test Registration with Duplicate Email
    console.log('\n--- 5. Testing POST /auth/register (Duplicate Email) ---');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Test User',
        email: testEmail,
        phone: '+91 99999 88888',
        password: 'TestPassword@123',
      }),
    });
    const dupData: any = await dupRes.json();
    console.log('Duplicate response status:', dupRes.status, dupData);
    if (dupRes.status !== 409 || dupData.success !== false) {
      throw new Error('Duplicate registration should return 409 Conflict!');
    }
    console.log('✔ Duplicate registration rejected with 409 Conflict');

    // 6. Test Registration with ADMIN role (Must be forbidden)
    console.log('\n--- 6. Testing POST /auth/register (Forbidden ADMIN Role) ---');
    const adminRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Admin Wannabe',
        email: `hacker_${Date.now()}@test.com`,
        phone: '+91 90000 00000',
        password: 'Password@123',
        role: 'ADMIN',
      }),
    });
    const adminData: any = await adminRes.json();
    console.log('Admin registration status:', adminRes.status, adminData);
    if (adminRes.status !== 400 || adminData.success !== false) {
      throw new Error('Attempting to register as ADMIN should return 400 Bad Request!');
    }
    console.log('✔ Arbitrary ADMIN creation blocked with 400 Bad Request');

    console.log('\n========================================');
    console.log('ALL AUTH SERVICE TESTS PASSED SUCCESSFULLY!');
    console.log('========================================');
  } catch (error) {
    console.error('[Auth Service Test ERROR]:', error);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
    process.exit(process.exitCode || 0);
  }
}

runTests();
