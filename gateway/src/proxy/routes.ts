import { Router, Request } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import config from '../config/services.js';

export const proxyRouter = Router();

/**
 * Mathematical Routing Function:
 * R(path) -> Target Service URL
 */
export function resolveTargetService(req: Request): string {
  const path = req.originalUrl || req.url || '';

  if (path.startsWith('/api/auth')) {
    return config.services.auth;
  }
  if (path.startsWith('/api/users')) {
    return config.services.user;
  }
  if (path.startsWith('/api/restaurants') || path.startsWith('/api/menu-items')) {
    return config.services.restaurant;
  }
  if (path.startsWith('/api/orders')) {
    return config.services.order;
  }

  return config.services.restaurant;
}

/**
 * Centralized Reverse Proxy Middleware
 * Rewrites /api/* -> /* (e.g. /api/restaurants -> http://localhost:3003/restaurants)
 */
const dynamicProxy = createProxyMiddleware({
  target: config.services.restaurant, // default fallback
  router: (req: any) => resolveTargetService(req),
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Strips only /api prefix, keeping /restaurants, /users, /orders, /auth
  },
  on: {
    proxyReq: (proxyReq, req: Request) => {
      // Forward user authentication context from gateway
      if (req.user) {
        proxyReq.setHeader('x-user-id', String(req.user.userId));
        proxyReq.setHeader('x-user-email', String(req.user.email));
        proxyReq.setHeader('x-user-role', String(req.user.role));
      }

      // Forward Request ID
      if (req.requestId) {
        proxyReq.setHeader('x-request-id', req.requestId);
      }

      // Re-stream request body if it was parsed by express.json()
      fixRequestBody(proxyReq, req);
    },
    error: (err, req: any, res: any) => {
      console.error(`[Gateway Proxy ERROR] Failed to proxy ${req.originalUrl || req.url}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message: 'Bad Gateway: Target microservice is currently unreachable or unavailable.',
        });
      }
    },
  },
});

// Mount on all /api routes
proxyRouter.use('/api', dynamicProxy);

export default proxyRouter;
