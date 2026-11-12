import { Router } from 'express';
import { getStaff, createStaff, toggleStaffActive } from '../controllers/staff.controller';
import { authenticate, requireTenant, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireTenant, requireRole(['STORE_ADMIN', 'SUPER_ADMIN']));

router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id/toggle', toggleStaffActive);

export default router;

