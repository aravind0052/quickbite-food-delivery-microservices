import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import { testDbConnection } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const isDbConnected = await testDbConnection();
  res.json({
    service: 'auth-service',
    status: 'UP',
    port: Number(PORT),
    database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
  });
});

// Auth Routes - support both /auth and root mounts
app.use('/auth', authRoutes);
app.use('/', authRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found on Auth Service',
  });
});

// Centralized Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Auth Service Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;

const isMain = process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));

if (isMain && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[QuickBite Auth Service] Running on port ${PORT}`);
    const isDbConnected = await testDbConnection();
    console.log(`[QuickBite Auth Service] Database: ${isDbConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  });
}
