import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const TARGET_PATH = '/api/restaurants';
const TOTAL_REQUESTS = 30;
const CONCURRENCY = 5;

interface RequestMetric {
  index: number;
  statusCode: number;
  durationMs: number;
  success: boolean;
  rateLimited: boolean;
  error?: string;
}

async function executeSingleRequest(index: number): Promise<RequestMetric> {
  const start = performance.now();
  try {
    const res = await axios.get(`${GATEWAY_URL}${TARGET_PATH}`, {
      timeout: 10000,
      headers: {
        'X-Client-Test': `load-test-${index}`,
      },
    });
    const durationMs = Math.round(performance.now() - start);
    return {
      index,
      statusCode: res.status,
      durationMs,
      success: res.status === 200,
      rateLimited: false,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    if (err.response) {
      return {
        index,
        statusCode: err.response.status,
        durationMs,
        success: false,
        rateLimited: err.response.status === 429,
        error: err.response.data?.message || err.message,
      };
    }
    return {
      index,
      statusCode: 0,
      durationMs,
      success: false,
      rateLimited: false,
      error: err.message,
    };
  }
}

async function runControlledLoadTest() {
  console.log('================================================================');
  console.log('       QUICKBITE API GATEWAY CONTROLLED CONCURRENCY TEST        ');
  console.log('================================================================');
  console.log(`Target URL        : ${GATEWAY_URL}${TARGET_PATH}`);
  console.log(`Total Requests    : ${TOTAL_REQUESTS}`);
  console.log(`Concurrency Level : ${CONCURRENCY} concurrent workers`);
  console.log(`Timestamp         : ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------\n');

  const results: RequestMetric[] = [];
  const startTime = performance.now();

  let currentIndex = 1;
  const queue: Promise<void>[] = [];

  const worker = async () => {
    while (currentIndex <= TOTAL_REQUESTS) {
      const idx = currentIndex++;
      const metric = await executeSingleRequest(idx);
      results.push(metric);
      const tag = metric.success
        ? '[200 OK]'
        : metric.rateLimited
        ? '[429 RATE-LIMITED]'
        : `[${metric.statusCode} ERROR]`;
      console.log(`[Req #${String(idx).padStart(2, '0')}] ${tag.padEnd(19)} Latency: ${metric.durationMs}ms`);
    }
  };

  for (let c = 0; c < CONCURRENCY; c++) {
    queue.push(worker());
  }

  await Promise.all(queue);
  const totalDurationMs = Math.round(performance.now() - startTime);

  // Statistics calculation
  const status200 = results.filter((r) => r.statusCode === 200).length;
  const status429 = results.filter((r) => r.statusCode === 429).length;
  const otherErrors = results.filter((r) => r.statusCode !== 200 && r.statusCode !== 429).length;

  const latencies = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const minLatency = latencies.length > 0 ? latencies[0] : 0;
  const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
  const avgLatency =
    latencies.length > 0
      ? Math.round(latencies.reduce((sum, v) => sum + v, 0) / latencies.length)
      : 0;
  const p95Latency =
    latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

  const rps = totalDurationMs > 0 ? ((TOTAL_REQUESTS / totalDurationMs) * 1000).toFixed(2) : '0';

  console.log('\n================================================================');
  console.log('                   LOAD TEST RESULTS SUMMARY                    ');
  console.log('================================================================');
  console.log(`Total Requests Processed : ${TOTAL_REQUESTS}`);
  console.log(`Total Wall Clock Time    : ${totalDurationMs} ms (${(totalDurationMs / 1000).toFixed(2)}s)`);
  console.log(`Average Throughput (RPS) : ${rps} req/sec`);
  console.log('----------------------------------------------------------------');
  console.log(`HTTP 200 OK (Allowed)    : ${status200}`);
  console.log(`HTTP 429 (Rate Limited)  : ${status429}`);
  console.log(`Other Errors             : ${otherErrors}`);
  console.log('----------------------------------------------------------------');
  console.log(`Min Latency              : ${minLatency} ms`);
  console.log(`Max Latency              : ${maxLatency} ms`);
  console.log(`Average Latency          : ${avgLatency} ms`);
  console.log(`95th Percentile (p95)    : ${p95Latency} ms`);
  console.log('================================================================');

  if (otherErrors > 0) {
    console.error('[Load Tester] Detected unexpected backend errors.');
    process.exit(1);
  } else {
    console.log('[Load Tester] PASSED: All requests successfully routed through API Gateway.');
    process.exit(0);
  }
}

runControlledLoadTest().catch((err) => {
  console.error('[Load Tester Fatal Error]:', err);
  process.exit(1);
});
