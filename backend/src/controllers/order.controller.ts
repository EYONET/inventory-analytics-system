import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  lineDiscount: z.number().nonnegative().default(0.0),
});

const paymentItemSchema = z.object({
  paymentMethod: z.enum(['CASH', 'TELEBIRR', 'CBE_BIRR', 'MPESA', 'CARD', 'STORE_CREDIT']),
  amount: z.number().positive(),
  tendered: z.number().nonnegative().default(0.0),
  changeGiven: z.number().nonnegative().default(0.0),
  referenceCode: z.string().optional(),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'Cart cannot be empty'),
  discountAmount: z.number().nonnegative().default(0.0),
  taxAmount: z.number().nonnegative().default(0.0),
  payments: z.array(paymentItemSchema).min(1, 'At least one payment method is required'),
  notes: z.string().optional(),
});

export const checkout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    const cashierId = req.user?.id;

    if (!storeId || !cashierId) {
      res.status(400).json({ success: false, error: 'Store tenant or cashier context missing' });
      return;
    }

    const data = checkoutSchema.parse(req.body);

    // 1. Fetch all requested products and verify store ownership & stock
    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId,
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      res.status(400).json({
        success: false,
        error: 'One or more items in the cart do not belong to this store or are discontinued',
      });
      return;
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Check stock availability
    for (const item of data.items) {
      const prod = productMap.get(item.productId)!;
      if (prod.currentStock < item.quantity) {
        res.status(400).json({
          success: false,
          error: `Insufficient stock for "${prod.name}". Available: ${prod.currentStock}, Requested: ${item.quantity}`,
        });
        return;
      }
    }

    // 2. Calculate subtotal, grand total
    let calculatedSubtotal = 0;
    const saleItemsData = data.items.map((item) => {
      const prod = productMap.get(item.productId)!;
      const lineSubtotal = prod.sellingPrice * item.quantity;
      const lineTotal = Math.max(0, lineSubtotal - item.lineDiscount);
      calculatedSubtotal += lineTotal;

      return {
        productId: prod.id,
        productName: prod.name,
        quantity: item.quantity,
        unitPrice: prod.sellingPrice,
        unitCost: prod.currentCostPrice, // SNAPSHOT HISTORICAL COGS!
        lineDiscount: item.lineDiscount,
        lineTotal,
      };
    });

    const grandTotal = Math.max(0, calculatedSubtotal - data.discountAmount + data.taxAmount);

    // Verify total payments cover the grand total
    const totalPaid = data.payments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(totalPaid - grandTotal) > 0.05) {
      res.status(400).json({
        success: false,
        error: `Total payment amount (${totalPaid.toFixed(2)}) does not match order grand total (${grandTotal.toFixed(2)})`,
      });
      return;
    }

    // 3. Generate receipt number: e.g. RCP-20261112-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `RCP-${dateStr}-${randomSuffix}`;

    // 4. ATOMIC PRISMA TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      // Create Sales Order
      const order = await tx.salesOrder.create({
        data: {
          storeId,
          receiptNumber,
          cashierId,
          subtotal: calculatedSubtotal,
          discountAmount: data.discountAmount,
          taxAmount: data.taxAmount,
          grandTotal,
          notes: data.notes,
        },
      });

      // Create Sale Items with historical cost
      await tx.saleItem.createMany({
        data: saleItemsData.map((item) => ({
          ...item,
          orderId: order.id,
        })),
      });

      // Create Payments (Split tender support)
      await tx.payment.createMany({
        data: data.payments.map((p) => ({
          orderId: order.id,
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          tendered: p.tendered,
          changeGiven: p.changeGiven,
          referenceCode: p.referenceCode,
        })),
      });

      // Stock Ledger Deductions & Product Counter decrement
      for (const item of data.items) {
        const prod = productMap.get(item.productId)!;

        // Append to immutable Stock Movement Ledger
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: item.productId,
            movementType: 'SALE',
            quantityDelta: -item.quantity,
            unitCostAtTime: prod.currentCostPrice,
            referenceId: order.id,
            notes: `Sold on Receipt #${receiptNumber}`,
          },
        });

        // Decrement Product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return order;
    });

    // 5. Fetch full receipt details to return to POS client
    const fullReceipt = await prisma.salesOrder.findUnique({
      where: { id: result.id },
      include: {
        cashier: {
          select: { name: true, email: true },
        },
        items: true,
        payments: true,
        store: {
          select: { name: true, phone: true, address: true, currency: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: fullReceipt,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Error processing checkout' });
  }
};

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const { receipt, limit = '50' } = req.query;

    const where: any = { storeId };
    if (receipt && typeof receipt === 'string') {
      where.receiptNumber = { contains: receipt as string };
    }

    const orders = await prisma.salesOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      include: {
        cashier: {
          select: { name: true },
        },
        items: true,
        payments: true,
      },
    });

    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching orders' });
  }
};

export const getOrderReceipt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    const id = req.params.id as string;

    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const order = await prisma.salesOrder.findFirst({
      where: { id, storeId },
      include: {
        cashier: { select: { name: true, email: true } },
        items: true,
        payments: true,
        store: { select: { name: true, phone: true, address: true, currency: true } },
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Receipt not found' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching receipt' });
  }
};
