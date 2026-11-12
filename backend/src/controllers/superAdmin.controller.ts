import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const activateTenantSchema = z.object({
  days: z.number().int().positive().default(30),
  notes: z.string().optional(),
});

export const getPlatformStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalStores = await prisma.store.count();
    const activeStores = await prisma.store.count({ where: { status: 'ACTIVE' } });
    const trialStores = await prisma.store.count({ where: { status: 'TRIAL' } });
    const suspendedStores = await prisma.store.count({ where: { status: 'SUSPENDED' } });

    const totalCashiers = await prisma.user.count({ where: { role: 'CASHIER' } });

    // Platform-wide GMV (Gross Merchandise Volume)
    const allOrders = await prisma.salesOrder.aggregate({
      _sum: { grandTotal: true },
      _count: { id: true },
    });

    // Total subscription revenue collected
    const subRevenue = await prisma.subscription.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        totalStores,
        activeStores,
        trialStores,
        suspendedStores,
        totalCashiers,
        platformGMV: allOrders._sum.grandTotal || 0,
        totalOrdersProcessed: allOrders._count.id || 0,
        subscriptionRevenueETB: subRevenue._sum.amount || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching platform stats' });
  }
};

export const getAllTenants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, status } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const stores = await prisma.store.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            salesOrders: true,
          },
        },
      },
    });

    res.json({ success: true, data: stores });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching tenants' });
  }
};

export const activateTenant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { days, notes } = activateTenantSchema.parse(req.body);

    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) {
      res.status(404).json({ success: false, error: 'Store tenant not found' });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.store.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          subscriptionExpiresAt: expiresAt,
        },
      });

      // Record approved subscription entry
      await tx.subscription.create({
        data: {
          storeId: id,
          amount: 800.0, // Standard monthly fee in ETB
          billingCycle: 'MONTHLY',
          paymentMethod: 'TELEBIRR',
          status: 'APPROVED',
          periodStart: new Date(),
          periodEnd: expiresAt,
          notes: notes || 'Subscription activated by Super Admin',
        },
      });

      return s;
    });

    res.json({
      success: true,
      message: `Store "${store.name}" successfully activated for ${days} days.`,
      data: updated,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Error activating tenant' });
  }
};

export const toggleTenantStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const store = await prisma.store.findUnique({ where: { id } });

    if (!store) {
      res.status(404).json({ success: false, error: 'Store not found' });
      return;
    }

    const newStatus = store.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const updated = await prisma.store.update({
      where: { id },
      data: { status: newStatus },
    });

    res.json({
      success: true,
      message: `Store "${store.name}" status updated to ${newStatus}.`,
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error updating status' });
  }
};
