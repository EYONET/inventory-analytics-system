import { Router } from 'express';
import { checkout, getOrders, getOrderReceipt } from '../controllers/order.controller';
import { authenticate, requireTenant } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireTenant);

router.post('/checkout', checkout);
router.get('/', getOrders);
router.get('/:id/receipt', getOrderReceipt);

export default router;

