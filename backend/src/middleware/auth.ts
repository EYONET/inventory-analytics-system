import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  storeId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization token missing or malformed' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    if (payload.storeId) {
      req.storeId = payload.storeId;
    }
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const requireRole = (allowedRoles: Array<'SUPER_ADMIN' | 'STORE_ADMIN' | 'CASHIER'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

export const requireTenant = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  // Super Admin can pass X-Store-Id header to act on behalf of a store
  if (req.user.role === 'SUPER_ADMIN') {
    const headerStoreId = req.headers['x-store-id'] as string;
    if (headerStoreId) {
      req.storeId = headerStoreId;
    }
    next();
    return;
  }

  if (!req.user.storeId) {
    res.status(403).json({ success: false, error: 'No store tenant associated with this account' });
    return;
  }

  req.storeId = req.user.storeId;
  next();
};

// Strips cost price from single product or product array for CASHIER role
export const sanitizeProductData = <T extends Record<string, any>>(data: T | T[], role?: string): any => {
  if (role !== 'CASHIER') return data;

  const sanitizeItem = (item: Record<string, any>) => {
    if (!item || typeof item !== 'object') return item;
    const { currentCostPrice, ...rest } = item;
    return rest;
  };

  if (Array.isArray(data)) {
    return data.map(sanitizeItem);
  }
  return sanitizeItem(data);
};

