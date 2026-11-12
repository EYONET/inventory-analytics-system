import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import { AuthenticatedRequest, sanitizeProductData } from '../middleware/auth';

const createProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  barcode: z.string().min(2),
  category: z.string().default('General'),
  description: z.string().optional(),
  sellingPrice: z.number().positive(),
  currentCostPrice: z.number().nonnegative(),
  initialStock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().positive().default(5),
});

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  sellingPrice: z.number().positive().optional(),
  currentCostPrice: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const adjustStockSchema = z.object({
  quantityDelta: z.number().int().refine((val) => val !== 0, 'Quantity delta cannot be zero'),
  movementType: z.enum(['PURCHASE', 'DAMAGE', 'RETURN', 'ADJUSTMENT']),
  unitCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  referenceId: z.string().optional(),
});

export const getProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const { category, search, activeOnly } = req.query;

    const where: any = {
      storeId,
    };

    if (activeOnly !== 'false') {
      where.isActive = true;
    }

    if (category && typeof category === 'string' && category !== 'All') {
      where.category = category;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const sanitized = sanitizeProductData(products, req.user?.role);

    res.json({
      success: true,
      data: sanitized,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error fetching products' });
  }
};

export const getProductByBarcode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    const barcode = req.params.barcode as string;

    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: {
        storeId,
        isActive: true,
        OR: [{ barcode }, { sku: barcode }],
      },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found with this barcode/SKU' });
      return;
    }

    const sanitized = sanitizeProductData(product, req.user?.role);
    res.json({ success: true, data: sanitized });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error searching barcode' });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const data = createProductSchema.parse(req.body);

    // Check unique barcode and SKU for this store
    const existing = await prisma.product.findFirst({
      where: {
        storeId,
        OR: [{ barcode: data.barcode }, { sku: data.sku }],
      },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: existing.barcode === data.barcode
          ? 'A product with this barcode already exists in your store'
          : 'A product with this SKU already exists in your store',
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId,
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          category: data.category,
          description: data.description,
          sellingPrice: data.sellingPrice,
          currentCostPrice: data.currentCostPrice,
          currentStock: data.initialStock,
          lowStockThreshold: data.lowStockThreshold,
        },
      });

      if (data.initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            storeId,
            productId: product.id,
            movementType: 'INITIAL',
            quantityDelta: data.initialStock,
            unitCostAtTime: data.currentCostPrice,
            notes: 'Initial stock intake upon product creation',
          },
        });
      }

      return product;
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Error creating product' });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    const id = req.params.id as string;

    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const data = updateProductSchema.parse(req.body);

    const product = await prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found in your store' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Error updating product' });
  }
};

export const adjustStock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    const id = req.params.id as string;

    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const data = adjustStockSchema.parse(req.body);

    const product = await prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const unitCost = data.unitCost !== undefined ? data.unitCost : product.currentCostPrice;

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Stock Movement Ledger entry
      const movement = await tx.stockMovement.create({
        data: {
          storeId,
          productId: id,
          movementType: data.movementType,
          quantityDelta: data.quantityDelta,
          unitCostAtTime: unitCost,
          notes: data.notes || `Stock adjusted via ${data.movementType}`,
          referenceId: data.referenceId,
        },
      });

      // 2. Update product stock and optionally cost price if it was a purchase
      const updateData: any = {
        currentStock: {
          increment: data.quantityDelta,
        },
      };

      if (data.movementType === 'PURCHASE' && data.unitCost !== undefined) {
        updateData.currentCostPrice = data.unitCost;
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: updateData,
      });

      return { product: updatedProduct, movement };
    });

    res.json({
      success: true,
      data: {
        product: result.product,
        movement: result.movement,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0].message });
      return;
    }
    res.status(500).json({ success: false, error: err.message || 'Error adjusting stock' });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.storeId;
    const id = req.params.id as string;

    if (!storeId) {
      res.status(400).json({ success: false, error: 'Store tenant context missing' });
      return;
    }

    const product = await prisma.product.findFirst({
      where: { id, storeId },
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Soft delete / deactivate
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Product deactivated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error deleting product' });
  }
};
