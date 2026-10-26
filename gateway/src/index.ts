import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import config from './config/services.js';
import metrics from './monitoring/metrics.js';
import requestIdMiddleware from './middleware/requestId.middleware.js';
import loggerMiddleware from './middleware/logger.middleware.js';
import rateLimiterMiddleware from './middleware/rateLimiter.middleware.js';
import authenticateJWT from './middleware/auth.middleware.js';
import proxyRouter from './proxy/routes.js';
import healthRouter from './routes/health.routes.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO for real-time gateway live monitoring
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

metrics.setSocketIO(io);

// ------------------------------------------------------------
// MIDDLEWARE PIPELINE
// ------------------------------------------------------------

// 1. Security & CORS
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// 2. Request body parsing
app.use(express.json());

// 3. Request ID Generation & Timing
app.use(requestIdMiddleware);

// 4. Request Logging & Latency Measurement
app.use(loggerMiddleware);

// 5. Gateway Health & Metrics Endpoints
app.use(healthRouter);

// 6. Mathematical Fixed-Window Rate Limiter
app.use(rateLimiterMiddleware);

// 7. Centralized JWT Authentication (Public vs Protected check & identity forwarding)
app.use(authenticateJWT);

// 8. Reverse Proxy Routing (R(path) -> Service via http-proxy-middleware)
app.use(proxyRouter);

// ------------------------------------------------------------
// ERROR & 404 HANDLERS
// ------------------------------------------------------------

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found on API Gateway. Verify path and service mapping.',
  });
});

// Centralized Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Gateway Critical Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error on API Gateway',
  });
});

export { app, server, io };
export default app;

const isMain = process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));

if (isMain && process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`[QuickBite Central API Gateway] Running on port ${config.port}`);
    console.log(`[Target Services Configuration]:`);
    console.log(`  Auth Service:       ${config.services.auth}`);
    console.log(`  User Service:       ${config.services.user}`);
    console.log(`  Restaurant Service: ${config.services.restaurant}`);
    console.log(`  Order Service:      ${config.services.order}`);
    console.log(`[Rate Limiting]:      ${config.rateLimitMax} reqs / ${config.rateLimitWindowMs}ms`);
    console.log(`[Socket.IO Monitor]:  READY on ws://localhost:${config.port}`);
    console.log(`====================================================`);
  });
}
