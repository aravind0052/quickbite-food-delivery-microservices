import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import orderRoutes from './routes/order.routes.js';
import { testDbConnection } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.ORDER_PORT || 3004;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const isDbConnected = await testDbConnection();
  res.json({
    service: 'order-service',
    status: 'UP',
    port: Number(PORT),
    database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
  });
});

// Order routes mounted on both /orders and root
app.use('/orders', orderRoutes);
app.use('/', orderRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found on Order Service',
  });
});

// Centralized Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Order Service Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;

const isMain = process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));

if (isMain && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[QuickBite Order Service] Running on port ${PORT}`);
    const isDbConnected = await testDbConnection();
    console.log(`[QuickBite Order Service] Database: ${isDbConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  });
}
