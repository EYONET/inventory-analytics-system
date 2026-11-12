import { Router } from 'express';
import {
  getProducts,
  getProductByBarcode,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, requireTenant, requireRole } from '../middleware/auth';

const router = Router();

// All product routes require valid authentication and a store tenant context
router.use(authenticate, requireTenant);

// Accessible by CASHIER, STORE_ADMIN, and SUPER_ADMIN
router.get('/', getProducts);
router.get('/barcode/:barcode', getProductByBarcode);

// Restricted to STORE_ADMIN or SUPER_ADMIN
router.post('/', requireRole(['STORE_ADMIN', 'SUPER_ADMIN']), createProduct);
router.put('/:id', requireRole(['STORE_ADMIN', 'SUPER_ADMIN']), updateProduct);
router.post('/:id/adjust-stock', requireRole(['STORE_ADMIN', 'SUPER_ADMIN']), adjustStock);
router.delete('/:id', requireRole(['STORE_ADMIN', 'SUPER_ADMIN']), deleteProduct);

export default router;

