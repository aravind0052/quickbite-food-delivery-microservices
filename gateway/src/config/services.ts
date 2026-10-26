import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  port: parseInt(process.env.GATEWAY_PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'quickbite_super_secret_jwt_key_2026_academic',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    restaurant: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
  },
};

export default config;
