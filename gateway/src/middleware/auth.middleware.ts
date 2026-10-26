import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/services.js';
import metrics from '../monitoring/metrics.js';

/**
 * Determines whether a route is public or requires JWT validation
 */
export function isPublicRoute(req: Request): boolean {
  const path = req.path;
  const method = req.method.toUpperCase();

  // Gateway internal endpoints & health checks are public
  if (path === '/health' || path.startsWith('/api/gateway')) {
    return true;
  }

  // Auth service endpoints are public
  if (
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/health' ||
    path.startsWith('/api/auth')
  ) {
    return true;
  }

  // Public customer browsing on restaurants
  if (method === 'GET') {
    if (
      path === '/api/restaurants' ||
      path === '/api/restaurants/search' ||
      path === '/api/restaurants/filter' ||
      /^\/api\/restaurants\/\d+$/.test(path) ||
      /^\/api\/restaurants\/\d+\/menu$/.test(path)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Gateway JWT Authentication Middleware
 * Validates JWT, extracts { userId, email, role }, and forwards user identity to microservices
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const publicRoute = isPublicRoute(req);

  if (!authHeader) {
    if (publicRoute) {
      req.jwtStatus = 'PUBLIC';
      next();
      return;
    }

    // Protected route with missing token
    req.jwtStatus = 'MISSING';
    const latency = Date.now() - (req.startTime || Date.now());

    metrics.recordRequestStart({
      id: req.requestId || 'req_unauth',
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      jwtStatus: 'MISSING',
    });

    metrics.recordRequestComplete({
      id: req.requestId || 'req_unauth',
      timestamp: new Date().toLocaleTimeString(),
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      statusCode: 401,
      latencyMs: latency,
      jwtStatus: 'MISSING',
      rateLimitStatus: 'ALLOWED',
    });

    console.log(
      `[${new Date().toLocaleTimeString()}] REQ ${req.requestId} ${req.method} ${req.path} 401 ${latency}ms JWT MISSING`
    );

    res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing authorization token.',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    if (publicRoute) {
      req.jwtStatus = 'PUBLIC';
      next();
      return;
    }

    req.jwtStatus = 'INVALID';
    const latency = Date.now() - (req.startTime || Date.now());

    metrics.recordRequestStart({
      id: req.requestId || 'req_unauth',
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      jwtStatus: 'INVALID',
    });

    metrics.recordRequestComplete({
      id: req.requestId || 'req_unauth',
      timestamp: new Date().toLocaleTimeString(),
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      statusCode: 401,
      latencyMs: latency,
      jwtStatus: 'INVALID',
      rateLimitStatus: 'ALLOWED',
    });

    console.log(
      `[${new Date().toLocaleTimeString()}] REQ ${req.requestId} ${req.method} ${req.path} 401 ${latency}ms JWT INVALID FORMAT`
    );

    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token format. Format must be Bearer <token>.',
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded: any = jwt.verify(token, config.jwtSecret);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    req.jwtStatus = 'VALID';

    // Inject forwarded user identity headers into request for microservices
    req.headers['x-user-id'] = String(decoded.userId);
    req.headers['x-user-email'] = String(decoded.email);
    req.headers['x-user-role'] = String(decoded.role);

    next();
  } catch (err: any) {
    if (publicRoute) {
      // For public routes, proceed even if provided token was expired/invalid
      req.jwtStatus = 'PUBLIC';
      next();
      return;
    }

    req.jwtStatus = 'INVALID';
    const latency = Date.now() - (req.startTime || Date.now());

    metrics.recordRequestStart({
      id: req.requestId || 'req_unauth',
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      jwtStatus: 'INVALID',
    });

    metrics.recordRequestComplete({
      id: req.requestId || 'req_unauth',
      timestamp: new Date().toLocaleTimeString(),
      method: req.method,
      path: req.path,
      targetService: req.targetService || 'gateway',
      statusCode: 401,
      latencyMs: latency,
      jwtStatus: 'INVALID',
      rateLimitStatus: 'ALLOWED',
    });

    console.log(
      `[${new Date().toLocaleTimeString()}] REQ ${req.requestId} ${req.method} ${req.path} 401 ${latency}ms JWT INVALID`
    );

    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token.',
    });
  }
}

export default authenticateJWT;
