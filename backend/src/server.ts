import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import analyticsRoutes from './routes/analytics.routes';
import staffRoutes from './routes/staff.routes';
import superAdminRoutes from './routes/superAdmin.routes';
import prisma from './config/prisma';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Retail SaaS Multi-Tenant Engine',
    database: 'Supabase PostgreSQL (Prisma)',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/super-admin', superAdminRoutes);

// 404 Route handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Retail SaaS Engine running on http://localhost:${PORT}`);
  console.log(` Ready for 2,000+ Multi-Tenant Stores (Supabase PostgreSQL)`);
  console.log(`=======================================================`);
});

// Graceful Shutdown
const shutdown = async () => {
  console.log('\nGracefully shutting down server...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database connection closed. Process exited.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;

