import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const TARGET_PATH = '/api/restaurants';
const TOTAL_BURST = 15;

async function runRateLimitValidation() {
  console.log('================================================================');
  console.log('     QUICKBITE API GATEWAY FIXED-WINDOW RATE LIMITER TEST       ');
  console.log('================================================================');
  console.log(`Gateway Target  : ${GATEWAY_URL}${TARGET_PATH}`);
  console.log(`Configured Limit: 10 requests / 60 seconds per IP`);
  console.log(`Test Burst Size : ${TOTAL_BURST} rapid consecutive requests`);
  console.log(`Timestamp       : ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------\n');

  let count200 = 0;
  let count429 = 0;
  let first429Index = -1;

  for (let i = 1; i <= TOTAL_BURST; i++) {
    const start = performance.now();
    try {
      const res = await axios.get(`${GATEWAY_URL}${TARGET_PATH}`, {
        timeout: 5000,
        headers: {
          'X-Test-Burst': `burst-${i}`,
        },
      });
      const ms = Math.round(performance.now() - start);
      if (res.status === 200) {
        count200++;
        console.log(`[Req #${String(i).padStart(2, '0')}] HTTP 200 OK (${ms}ms) -> Allowed`);
      }
    } catch (err: any) {
      const ms = Math.round(performance.now() - start);
      if (err.response && err.response.status === 429) {
        count429++;
        if (first429Index === -1) {
          first429Index = i;
        }
        const retryAfter = err.response.headers['retry-after'];
        const msg = err.response.data?.message || 'Rate limit exceeded';
        console.log(
          `[Req #${String(i).padStart(2, '0')}] HTTP 429 TOO MANY REQUESTS (${ms}ms) -> Blocked (Retry-After: ${retryAfter || 'N/A'}s)`
        );
      } else {
        console.error(
          `[Req #${String(i).padStart(2, '0')}] Unexpected HTTP status:`,
          err.response?.status || err.message
        );
      }
    }
  }

  console.log('\n================================================================');
  console.log('RATE LIMIT TEST SUMMARY:');
  console.log('================================================================');
  console.log(`Requests Allowed (HTTP 200)      : ${count200}`);
  console.log(`Requests Blocked (HTTP 429)      : ${count429}`);
  console.log(`First Blocked Request Index      : ${first429Index > 0 ? `#${first429Index}` : 'None'}`);
  console.log('----------------------------------------------------------------');

  if (count429 > 0) {
    console.log('✓ PASSED: Gateway fixed-window rate limiter successfully activated and enforced HTTP 429.');
    process.exit(0);
  } else {
    console.error('✕ FAILED: Rate limit was not triggered (no HTTP 429 received). Check rate limiter threshold.');
    process.exit(1);
  }
}

runRateLimitValidation().catch((err) => {
  console.error('[Rate Limit Test Fatal Error]:', err);
  process.exit(1);
});
