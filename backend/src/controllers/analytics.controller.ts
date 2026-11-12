import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export const getDashboardKPIs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    // Start of today (00:00:00 UTC)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Fetch today's completed orders with their items
    const todayOrders = await prisma.salesOrder.findMany({
      where: {
        storeId,
        status: 'COMPLETED',
        createdAt: { gte: todayStart },
      },
      include: {
        items: true,
      },
    });

    let todayGrossSales = 0;
    let todayDiscounts = 0;
    let todayCOGS = 0;

    for (const order of todayOrders) {
      todayGrossSales += order.grandTotal;
      todayDiscounts += order.discountAmount;
      for (const item of order.items) {
        todayCOGS += item.unitCost * item.quantity;
      }
    }

    const todayNetProfit = Math.max(0, todayGrossSales - todayCOGS);
    const todayOrdersCount = todayOrders.length;
    const averageOrderValue = todayOrdersCount > 0 ? todayGrossSales / todayOrdersCount : 0;
    const profitMargin = todayGrossSales > 0 ? (todayNetProfit / todayGrossSales) * 100 : 0;

    // Count low stock items
    const allActiveProducts = await prisma.product.findMany({
      where: { storeId, isActive: true },
      select: { id: true, currentStock: true, lowStockThreshold: true },
    });

    const lowStockCount = allActiveProducts.filter((p) => p.currentStock <= p.lowStockThreshold).length;

    // Calculate dead stock count (items with 0 sales in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const soldProductIds = await prisma.saleItem.findMany({
      where: {
        order: {
          storeId,
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      select: { productId: true },
      distinct: ['productId'],
    });

    const soldSet = new Set(soldProductIds.map((s) => s.productId));
    const deadStockCount = allActiveProducts.filter((p) => !soldSet.has(p.id)).length;

    res.json({
      success: true,
      data: {
        todayGrossSales,
        todayCOGS,
        todayNetProfit,
        profitMargin: Math.round(profitMargin * 10) / 10,
        todayOrdersCount,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        lowStockCount,
        deadStockCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching analytics' });
  }
};

export const getSalesTrends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const days = parseInt((req.query.days as string) || '7', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.salesOrder.findMany({
      where: {
        storeId,
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by Date (YYYY-MM-DD)
    const trendMap: Record<string, { date: string; revenue: number; cogs: number; profit: number; orders: number }> = {};

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { date: key, revenue: 0, cogs: 0, profit: 0, orders: 0 };
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].revenue += order.grandTotal;
        trendMap[key].orders += 1;
        let orderCOGS = 0;
        for (const item of order.items) {
          orderCOGS += item.unitCost * item.quantity;
        }
        trendMap[key].cogs += orderCOGS;
        trendMap[key].profit += order.grandTotal - orderCOGS;
      }
    }

    const timeline = Object.values(trendMap);

    res.json({ success: true, data: timeline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching sales trends' });
  }
};

export const getLowStockItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const products = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
      },
      orderBy: { currentStock: 'asc' },
    });

    const lowStock = products.filter((p) => p.currentStock <= p.lowStockThreshold);

    res.json({ success: true, data: lowStock });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching low stock' });
  }
};

export const getDeadStockItems = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const days = parseInt((req.query.days as string) || '30', 10);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const allProducts = await prisma.product.findMany({
      where: { storeId, isActive: true },
    });

    const soldItems = await prisma.saleItem.findMany({
      where: {
        order: {
          storeId,
          status: 'COMPLETED',
          createdAt: { gte: thresholdDate },
        },
      },
      select: { productId: true },
      distinct: ['productId'],
    });

    const activeSet = new Set(soldItems.map((s) => s.productId));
    const deadStock = allProducts.filter((p) => !activeSet.has(p.id));

    res.json({ success: true, data: deadStock });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching dead stock' });
  }
};

export const getStaffPerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const staffMembers = await prisma.user.findMany({
      where: { storeId },
      select: { id: true, name: true, email: true, role: true },
    });

    const staffStats = await Promise.all(
      staffMembers.map(async (member) => {
        const orders = await prisma.salesOrder.findMany({
          where: {
            storeId,
            cashierId: member.id,
            status: 'COMPLETED',
          },
          select: { grandTotal: true },
        });

        const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          ordersCount: orders.length,
          totalRevenue,
          averageTicket: orders.length > 0 ? totalRevenue / orders.length : 0,
        };
      })
    );

    res.json({ success: true, data: staffStats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching staff performance' });
  }
};

