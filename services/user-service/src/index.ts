import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/user.routes.js';
import { testDbConnection } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.USER_PORT || 3002;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const isDbConnected = await testDbConnection();
  res.json({
    service: 'user-service',
    status: 'UP',
    port: Number(PORT),
    database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
  });
});

// User routes - mounted on both /users and root
app.use('/users', userRoutes);
app.use('/', userRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found on User Service',
  });
});

// Centralized Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[User Service Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;

const isMain = process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));

if (isMain && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[QuickBite User Service] Running on port ${PORT}`);
    const isDbConnected = await testDbConnection();
    console.log(`[QuickBite User Service] Database: ${isDbConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  });
}
