import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

async function runJwtValidationSuite() {
  console.log('================================================================');
  console.log('        QUICKBITE API GATEWAY JWT AUTHENTICATION TEST           ');
  console.log('================================================================');
  console.log(`Gateway Base URL : ${GATEWAY_URL}`);
  console.log(`Timestamp        : ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------\n');

  let passedTests = 0;
  const totalTests = 4;

  // TEST 1: Unauthenticated request to protected route
  console.log('[TEST 1/4] Testing protected route WITHOUT Authorization header...');
  try {
    const res = await axios.get(`${GATEWAY_URL}/api/orders/my-orders`);
    console.error(`  ✕ FAILED: Expected 401, but received ${res.status}`);
  } catch (err: any) {
    if (err.response && err.response.status === 401) {
      console.log(`  ✓ PASSED: Gateway returned 401 Unauthorized (${err.response.data?.message || 'Token missing'})`);
      passedTests++;
    } else {
      console.error(`  ✕ FAILED: Expected 401, got ${err.response?.status || err.message}`);
    }
  }

  // TEST 2: Request with invalid / forged token
  console.log('\n[TEST 2/4] Testing protected route with INVALID / TAMPERED Bearer token...');
  try {
    const res = await axios.get(`${GATEWAY_URL}/api/orders/my-orders`, {
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      },
    });
    console.error(`  ✕ FAILED: Expected 401, but received ${res.status}`);
  } catch (err: any) {
    if (err.response && err.response.status === 401) {
      console.log(`  ✓ PASSED: Gateway rejected forged token with 401 (${err.response.data?.message || 'Invalid token'})`);
      passedTests++;
    } else {
      console.error(`  ✕ FAILED: Expected 401, got ${err.response?.status || err.message}`);
    }
  }

  // TEST 3: Login to obtain legitimate JWT via Gateway
  console.log('\n[TEST 3/4] Authenticating via Gateway (POST /api/auth/login)...');
  let validToken = '';
  try {
    const loginRes = await axios.post(`${GATEWAY_URL}/api/auth/login`, {
      email: 'customer01@quickbite.demo',
      password: 'QuickBite@123',
    });

    if (loginRes.status === 200 && loginRes.data?.token) {
      validToken = loginRes.data.token;
      console.log(`  ✓ PASSED: Successfully authenticated. Received JWT (length: ${validToken.length})`);
      passedTests++;
    } else {
      console.error(`  ✕ FAILED: Login did not return token.`);
    }
  } catch (err: any) {
    console.error(`  ✕ FAILED: Login request error:`, err.response?.data || err.message);
  }

  // TEST 4: Protected route with valid token
  console.log('\n[TEST 4/4] Testing protected route WITH VALID Bearer token...');
  if (validToken) {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      if (res.status === 200 && res.data?.success) {
        console.log(`  ✓ PASSED: Gateway verified JWT, injected user identity, and returned customer orders (HTTP 200)`);
        console.log(`    Order count returned: ${res.data.data?.length ?? 0}`);
        passedTests++;
      } else {
        console.error(`  ✕ FAILED: Expected 200 with data, got:`, res.data);
      }
    } catch (err: any) {
      console.error(`  ✕ FAILED: Valid token was rejected:`, err.response?.data || err.message);
    }
  } else {
    console.error(`  ✕ SKIPPED: Cannot execute Test 4 without valid token.`);
  }

  console.log('\n================================================================');
  console.log(`JWT VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('[JWT Suite] All assertions succeeded. Gateway centralized auth is fully operational.');
    process.exit(0);
  } else {
    console.error('[JWT Suite] One or more tests failed.');
    process.exit(1);
  }
}

runJwtValidationSuite().catch((err) => {
  console.error('[JWT Suite Fatal Error]:', err);
  process.exit(1);
});
