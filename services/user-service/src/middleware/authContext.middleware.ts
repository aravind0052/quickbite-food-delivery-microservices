import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware that extracts authenticated user information forwarded by the API Gateway
 * Headers: x-user-id, x-user-email, x-user-role
 */
export function requireAuthContext(req: Request, res: Response, next: NextFunction): void {
  const userIdHeader = req.headers['x-user-id'];
  const userEmailHeader = req.headers['x-user-email'];
  const userRoleHeader = req.headers['x-user-role'];

  if (!userIdHeader) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing user authentication context from API Gateway.',
    });
    return;
  }

  const userId = parseInt(String(userIdHeader), 10);
  if (isNaN(userId)) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid user ID context.',
    });
    return;
  }

  req.user = {
    userId,
    email: String(userEmailHeader || ''),
    role: String(userRoleHeader || 'CUSTOMER'),
  };

  next();
}
