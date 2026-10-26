import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
      targetService?: string;
      jwtStatus?: 'PUBLIC' | 'VALID' | 'INVALID' | 'MISSING';
      rateLimitStatus?: 'ALLOWED' | 'BLOCKED';
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Generates unique Request ID for every incoming gateway request
 * Format: req_YYYYMMDD_randomHex
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex');
  const reqId = `req_${dateStr}_${randomHex}`;

  req.requestId = reqId;
  req.startTime = Date.now();
  req.jwtStatus = 'PUBLIC';
  req.rateLimitStatus = 'ALLOWED';

  // Attach X-Request-ID header to both incoming request and outgoing response
  res.setHeader('X-Request-ID', reqId);
  req.headers['x-request-id'] = reqId;

  next();
}

export default requestIdMiddleware;
