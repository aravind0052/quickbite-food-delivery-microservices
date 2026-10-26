import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import restaurantRoutes from './routes/restaurant.routes.js';
import menuRoutes from './routes/menu.routes.js';
import { testDbConnection } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.RESTAURANT_PORT || 3003;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const isDbConnected = await testDbConnection();
  res.json({
    service: 'restaurant-service',
    status: 'UP',
    port: Number(PORT),
    database: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
  });
});

// Mount Routes
app.use('/restaurants', restaurantRoutes);
app.use('/menu-items', menuRoutes);
app.use('/', restaurantRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found on Restaurant Service',
  });
});

// Centralized Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Restaurant Service Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;

const isMain = process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));

if (isMain && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`[QuickBite Restaurant Service] Running on port ${PORT}`);
    const isDbConnected = await testDbConnection();
    console.log(`[QuickBite Restaurant Service] Database: ${isDbConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
  });
}
