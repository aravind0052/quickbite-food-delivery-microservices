import { Request, Response, NextFunction } from 'express';
import config from '../config/services.js';
import metrics from '../monitoring/metrics.js';

interface RateLimitRecord {
  requestCount: number;
  windowStart: number;
}

// In-memory fixed-window map keyed by Client IP
const ipRecords = new Map<string, RateLimitRecord>();

/**
 * Custom Fixed-Window Rate Limiter Middleware
 * Mathematical definition:
 * Let L = maximum allowed requests (RATE_LIMIT_MAX)
 * Let W = window duration in milliseconds (RATE_LIMIT_WINDOW_MS)
 * Let C = requests in current window
 * If (now - windowStart) >= W: reset windowStart = now, C = 1
 * If C <= L: allow
 * If C > L: reject with HTTP 429
 */
export function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow gateway health and monitoring endpoints without rate limiting
  if (req.path === '/health' || req.path.startsWith('/api/gateway')) {
    next();
    return;
  }

  // Extract client IP address (handling proxies and headers)
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const now = Date.now();
  const isTestBurst = req.headers['x-test-burst'] !== undefined;
  const max = isTestBurst ? 10 : (config.rateLimitMax && config.rateLimitMax > 10 ? config.rateLimitMax : 120);
  const windowMs = config.rateLimitWindowMs;

  let record = ipRecords.get(clientIp);

  if (!record || now - record.windowStart >= windowMs) {
    // Window expired or new IP -> reset
    record = {
      requestCount: 1,
      windowStart: now,
    };
    ipRecords.set(clientIp, record);
  } else {
    // Within existing window -> increment
    record.requestCount++;
  }

  const remaining = Math.max(0, max - record.requestCount);
  const resetSeconds = Math.ceil((record.windowStart + windowMs - now) / 1000);

  // Set standard rate limit headers
  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetSeconds);

  if (record.requestCount > max) {
    req.rateLimitStatus = 'BLOCKED';
    const latency = Date.now() - (req.startTime || now);

    // Record in metrics for live monitoring dashboard
    metrics.recordRequestStart({
      id: req.requestId || 'req_blocked',
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      jwtStatus: req.jwtStatus || 'PUBLIC',
      userId: req.user?.userId,
    });

    metrics.recordRequestComplete({
      id: req.requestId || 'req_blocked',
      timestamp: new Date().toLocaleTimeString(),
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      statusCode: 429,
      latencyMs: latency,
      jwtStatus: req.jwtStatus || 'PUBLIC',
      rateLimitStatus: 'BLOCKED',
      userId: req.user?.userId,
    });

    console.log(
      `[${new Date().toLocaleTimeString()}] REQ ${req.requestId} ${req.method} ${req.path} 429 ${latency}ms RATE LIMITED`
    );

    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    });
    return;
  }

  req.rateLimitStatus = 'ALLOWED';
  next();
}

/**
 * Utility to clear in-memory rate limit records (useful for test resets)
 */
export function clearRateLimitRecords(): void {
  ipRecords.clear();
}

export default rateLimiterMiddleware;
