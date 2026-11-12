import { Router } from 'express';
import { login, me, registerStore } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register-store', registerStore);
router.get('/me', authenticate, me);

export default router;

