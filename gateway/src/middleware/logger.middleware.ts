import { Request, Response, NextFunction } from 'express';
import metrics, { RequestLogEntry } from '../monitoring/metrics.js';

/**
 * Determines target microservice from the path
 * Mathematical routing function: R(path) -> Service
 */
export function getTargetService(path: string): string {
  if (path.startsWith('/api/auth')) return 'auth';
  if (path.startsWith('/api/users')) return 'user';
  if (path.startsWith('/api/restaurants') || path.startsWith('/api/menu-items')) return 'restaurant';
  if (path.startsWith('/api/orders')) return 'order';
  return 'gateway';
}

/**
 * Gateway Request Logging and Latency Measurement Middleware
 */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const targetService = getTargetService(req.path);
  req.targetService = targetService;

  // Record request ingress event (client -> gateway)
  metrics.recordRequestStart({
    id: req.requestId,
    method: req.method,
    path: req.path,
    targetService,
    jwtStatus: req.jwtStatus || 'PUBLIC',
    userId: req.user?.userId,
  });

  // Listen for response completion
  res.on('finish', () => {
    // Only process if not already recorded (e.g. rate limit / auth 401/429 early exit)
    if (res.statusCode === 429 || (res.statusCode === 401 && (req.jwtStatus === 'INVALID' || req.jwtStatus === 'MISSING'))) {
      return;
    }

    const latencyMs = Date.now() - (req.startTime || Date.now());
    const timeStr = new Date().toLocaleTimeString();

    const entry: RequestLogEntry = {
      id: req.requestId,
      timestamp: timeStr,
      method: req.method,
      path: req.path,
      targetService,
      statusCode: res.statusCode,
      latencyMs,
      jwtStatus: req.jwtStatus || 'PUBLIC',
      rateLimitStatus: req.rateLimitStatus || 'ALLOWED',
      userId: req.user?.userId,
    };

    // Print sanitized formatted log
    console.log(
      `[${timeStr}] REQ ${req.requestId} ${req.method} ${req.path} -> ${targetService}-service ${res.statusCode} ${latencyMs}ms`
    );

    metrics.recordRequestComplete(entry);
  });

  next();
}

export default loggerMiddleware;
