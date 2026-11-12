import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ethio-retail-pos-jwt-super-secret-key-2026-production';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'STORE_ADMIN' | 'CASHIER';
  storeId?: string | null;
  name: string;
}

export const signToken = (payload: TokenPayload, expiresIn: any = '7d'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
