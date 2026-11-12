import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(['STORE_ADMIN', 'CASHIER']).default('CASHIER'),
});

export const getStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const staff = await prisma.user.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: staff });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching staff' });
  }
};

export const createStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const data = createStaffSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      res.status(400).json({ success: false, error: 'A user with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        storeId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Error creating staff' });
  }
};

export const toggleStaffActive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    const id = req.params.id as string;

    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { id, storeId },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error updating staff status' });
  }
};
