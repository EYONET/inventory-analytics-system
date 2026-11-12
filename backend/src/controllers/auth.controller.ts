import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerStoreSchema = z.object({
  storeName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        store: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Check store subscription status if not super admin
    if (user.role !== 'SUPER_ADMIN' && user.store) {
      if (user.store.status === 'SUSPENDED') {
        res.status(403).json({
          success: false,
          error: 'Your store account is suspended. Please contact support or renew your subscription.',
        });
        return;
      }
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      name: user.name,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          storeId: user.storeId,
          store: user.store
            ? {
                id: user.store.id,
                name: user.store.name,
                currency: user.store.currency,
                status: user.store.status,
                trialEndsAt: user.store.trialEndsAt,
                subscriptionExpiresAt: user.store.subscriptionExpiresAt,
              }
            : null,
        },
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { store: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        storeId: user.storeId,
        store: user.store,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

export const registerStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = registerStoreSchema.parse(req.body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      res.status(400).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const slug = data.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day free trial

    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: data.storeName,
          slug,
          phone: data.phone,
          address: data.address,
          currency: 'ETB',
          status: 'TRIAL',
          trialEndsAt,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: 'STORE_ADMIN',
          storeId: store.id,
        },
      });

      return { store, user };
    });

    const token = signToken({
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      storeId: result.store.id,
      name: result.user.name,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        store: result.store,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

