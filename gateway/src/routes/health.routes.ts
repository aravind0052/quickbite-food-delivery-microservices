import { Router, Request, Response } from 'express';
import config from '../config/services.js';
import metrics from '../monitoring/metrics.js';
import { clearRateLimitRecords } from '../middleware/rateLimiter.middleware.js';

export const healthRouter = Router();

/**
 * Gateway basic health check
 * GET /health
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'api-gateway',
    status: 'UP',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Live multi-service health monitor
 * GET /api/gateway/services-health
 * Pings all microservices and checks their response time
 */
healthRouter.get('/api/gateway/services-health', async (_req: Request, res: Response) => {
  const targetServices = [
    { name: 'Auth Service', key: 'auth', url: `${config.services.auth}/health` },
    { name: 'User Service', key: 'user', url: `${config.services.user}/health` },
    { name: 'Restaurant Service', key: 'restaurant', url: `${config.services.restaurant}/health` },
    { name: 'Order Service', key: 'order', url: `${config.services.order}/health` },
  ];

  const results = await Promise.all(
    targetServices.map(async (svc) => {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(svc.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;

        if (response.ok) {
          const body: any = await response.json();
          return {
            service: svc.name,
            key: svc.key,
            status: 'ONLINE',
            statusCode: response.status,
            database: body.database || 'CONNECTED',
            responseTime: `${responseTime}ms`,
          };
        } else {
          return {
            service: svc.name,
            key: svc.key,
            status: 'DEGRADED',
            statusCode: response.status,
            database: 'UNKNOWN',
            responseTime: `${responseTime}ms`,
          };
        }
      } catch (err: any) {
        return {
          service: svc.name,
          key: svc.key,
          status: 'OFFLINE',
          statusCode: 503,
          database: 'DISCONNECTED',
          responseTime: `${Date.now() - startTime}ms`,
          error: err.message || 'Connection refused',
        };
      }
    })
  );

  const allOnline = results.every((r) => r.status === 'ONLINE');

  res.json({
    gateway: {
      service: 'API Gateway',
      status: 'ONLINE',
      port: config.port,
    },
    overallStatus: allOnline ? 'HEALTHY' : 'DEGRADED',
    services: results,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Gateway metrics snapshot for monitoring dashboard
 * GET /api/gateway/metrics
 */
healthRouter.get('/api/gateway/metrics', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: metrics.getSnapshot(),
  });
});

/**
 * Reset rate limit records
 * POST /api/gateway/reset-rate-limit
 */
healthRouter.post('/api/gateway/reset-rate-limit', (_req: Request, res: Response) => {
  clearRateLimitRecords();
  res.json({
    success: true,
    message: 'Rate limit in-memory counters have been cleared.',
  });
});

export default healthRouter;
