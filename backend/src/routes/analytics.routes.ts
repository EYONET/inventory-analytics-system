import { Router } from 'express';
import {
  getDashboardKPIs,
  getSalesTrends,
  getLowStockItems,
  getDeadStockItems,
  getStaffPerformance,
} from '../controllers/analytics.controller';
import { authenticate, requireTenant, requireRole } from '../middleware/auth';

const router = Router();

// Financial and profit analytics strictly require STORE_ADMIN or SUPER_ADMIN
router.use(authenticate, requireTenant, requireRole(['STORE_ADMIN', 'SUPER_ADMIN']));

router.get('/dashboard', getDashboardKPIs);
router.get('/trends', getSalesTrends);
router.get('/low-stock', getLowStockItems);
router.get('/dead-stock', getDeadStockItems);
router.get('/staff', getStaffPerformance);

export default router;

