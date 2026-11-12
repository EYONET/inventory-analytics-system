import { Router } from 'express';
import {
  getPlatformStats,
  getAllTenants,
  activateTenant,
  toggleTenantStatus,
} from '../controllers/superAdmin.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Strictly reserved for platform SUPER_ADMIN
router.use(authenticate, requireRole(['SUPER_ADMIN']));

router.get('/stats', getPlatformStats);
router.get('/tenants', getAllTenants);
router.post('/tenants/:id/activate', activateTenant);
router.post('/tenants/:id/toggle-status', toggleTenantStatus);

export default router;

