import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Multi-Tenant Retail SaaS Seeding ---');

  // Clear existing data in reverse order of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const cashierPasswordHash = await bcrypt.hash('cashier123', 10);

  // 1. Create Super Admin (Platform Owner)
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Platform Super Admin',
      email: 'superadmin@saas.com',
      passwordHash: defaultPasswordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log(` Created Super Admin: ${superAdmin.email}`);

  // 2. Create Store #1: Bole Supermarket
  const boleStore = await prisma.store.create({
    data: {
      name: 'Bole Supermarket',
      slug: 'bole-supermarket',
      phone: '+251911223344',
      address: 'Bole Medhanialem, Addis Ababa',
      currency: 'ETB',
      status: 'ACTIVE',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days active
    },
  });

  // Store #1 Users
  const boleAdmin = await prisma.user.create({
    data: {
      storeId: boleStore.id,
      name: 'Dawit Yohannes (Owner)',
      email: 'bole_admin@store.com',
      phone: '+251911223344',
      passwordHash: defaultPasswordHash,
      role: 'STORE_ADMIN',
    },
  });

  const boleCashier1 = await prisma.user.create({
    data: {
      storeId: boleStore.id,
      name: 'Selamawit Bekele',
      email: 'cashier1@bole.com',
      phone: '+251922334455',
      passwordHash: cashierPasswordHash,
      role: 'CASHIER',
    },
  });

  const boleCashier2 = await prisma.user.create({
    data: {
      storeId: boleStore.id,
      name: 'Abebe Tadesse',
      email: 'cashier2@bole.com',
      phone: '+251933445566',
      passwordHash: cashierPasswordHash,
      role: 'CASHIER',
    },
  });

  console.log(` Created Store #1: ${boleStore.name} with Admin & 2 Cashiers`);

  // Store #1 Products
  const boleProductsData = [
    { name: 'Anchor Milk Powder 400g', sku: 'MILK-001', barcode: '6001001', category: 'Dairy', sellingPrice: 450, currentCostPrice: 330, currentStock: 24, lowStockThreshold: 5 },
    { name: 'Bahr Dar White Rice 5kg', sku: 'RICE-005', barcode: '6001002', category: 'Groceries', sellingPrice: 680, currentCostPrice: 520, currentStock: 35, lowStockThreshold: 10 },
    { name: 'Hayat Sunflower Oil 3L', sku: 'OIL-003', barcode: '6001003', category: 'Groceries', sellingPrice: 950, currentCostPrice: 760, currentStock: 18, lowStockThreshold: 5 },
    { name: 'Tomoca Roast Coffee 250g', sku: 'COF-001', barcode: '6001004', category: 'Beverages', sellingPrice: 380, currentCostPrice: 260, currentStock: 40, lowStockThreshold: 8 },
    { name: 'Mama Whole Milk 500ml', sku: 'MILK-002', barcode: '6001005', category: 'Dairy', sellingPrice: 85, currentCostPrice: 65, currentStock: 50, lowStockThreshold: 12 },
    { name: 'Ye-Habesha Teff Flour 10kg', sku: 'TEFF-010', barcode: '6001006', category: 'Groceries', sellingPrice: 1400, currentCostPrice: 1100, currentStock: 15, lowStockThreshold: 5 },
    { name: 'Omo Washing Powder 1kg', sku: 'DET-001', barcode: '6001007', category: 'Household', sellingPrice: 290, currentCostPrice: 210, currentStock: 22, lowStockThreshold: 6 },
    { name: 'Pepsi 500ml Bottle', sku: 'BEV-001', barcode: '6001008', category: 'Beverages', sellingPrice: 45, currentCostPrice: 32, currentStock: 60, lowStockThreshold: 15 },
    { name: 'Arki Natural Water 1L', sku: 'WAT-001', barcode: '6001009', category: 'Beverages', sellingPrice: 30, currentCostPrice: 18, currentStock: 80, lowStockThreshold: 20 },
    { name: 'Desta Soft Tissue 4-Pack', sku: 'TIS-004', barcode: '6001010', category: 'Household', sellingPrice: 160, currentCostPrice: 110, currentStock: 3, lowStockThreshold: 5 }, // LOW STOCK!
    { name: 'Imported Olive Oil 500ml', sku: 'OIL-005', barcode: '6001011', category: 'Groceries', sellingPrice: 1200, currentCostPrice: 950, currentStock: 8, lowStockThreshold: 2 }, // DEAD STOCK!
    { name: 'Zest Care Soap 100g', sku: 'SOAP-001', barcode: '6001012', category: 'Personal Care', sellingPrice: 65, currentCostPrice: 42, currentStock: 28, lowStockThreshold: 8 },
  ];

  const boleProducts = [];
  for (const p of boleProductsData) {
    const prod = await prisma.product.create({
      data: {
        storeId: boleStore.id,
        ...p,
      },
    });
    boleProducts.push(prod);

    // Initial stock movement
    await prisma.stockMovement.create({
      data: {
        storeId: boleStore.id,
        productId: prod.id,
        movementType: 'INITIAL',
        quantityDelta: p.currentStock,
        unitCostAtTime: p.currentCostPrice,
        notes: 'Initial stock intake upon store launch',
      },
    });
  }
  console.log(` Seeded ${boleProducts.length} items for Bole Supermarket`);

  // Seed 5 historical completed sales orders for Bole Supermarket to power analytics
  const sampleSales = [
    { items: [{ prodIndex: 0, qty: 2 }, { prodIndex: 7, qty: 4 }], paymentMethod: 'CASH', change: 10, ref: undefined, daysAgo: 0 },
    { items: [{ prodIndex: 1, qty: 1 }, { prodIndex: 3, qty: 2 }], paymentMethod: 'TELEBIRR', change: 0, ref: 'TB-982143', daysAgo: 0 },
    { items: [{ prodIndex: 2, qty: 1 }, { prodIndex: 5, qty: 1 }], paymentMethod: 'CBE_BIRR', change: 0, ref: 'CBE-771209', daysAgo: 1 },
    { items: [{ prodIndex: 4, qty: 3 }, { prodIndex: 6, qty: 1 }], paymentMethod: 'CASH', change: 5, ref: undefined, daysAgo: 2 },
    { items: [{ prodIndex: 3, qty: 1 }, { prodIndex: 8, qty: 5 }], paymentMethod: 'TELEBIRR', change: 0, ref: 'TB-551982', daysAgo: 3 },
  ];

  for (let i = 0; i < sampleSales.length; i++) {
    const sale = sampleSales[i];
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - sale.daysAgo);
    orderDate.setHours(10 + i * 2, 15, 0, 0);

    let subtotal = 0;
    const itemsData = sale.items.map((it) => {
      const p = boleProducts[it.prodIndex];
      const lineTotal = p.sellingPrice * it.qty;
      subtotal += lineTotal;
      return {
        productId: p.id,
        productName: p.name,
        quantity: it.qty,
        unitPrice: p.sellingPrice,
        unitCost: p.currentCostPrice,
        lineTotal,
      };
    });

    const receiptNumber = `RCP-BOLE-${1000 + i}`;
    const order = await prisma.salesOrder.create({
      data: {
        storeId: boleStore.id,
        receiptNumber,
        cashierId: i % 2 === 0 ? boleCashier1.id : boleCashier2.id,
        subtotal,
        grandTotal: subtotal,
        status: 'COMPLETED',
        createdAt: orderDate,
        items: {
          create: itemsData,
        },
        payments: {
          create: [
            {
              paymentMethod: sale.paymentMethod as any,
              amount: subtotal,
              tendered: sale.paymentMethod === 'CASH' ? subtotal + sale.change : subtotal,
              changeGiven: sale.change,
              referenceCode: sale.ref,
              createdAt: orderDate,
            },
          ],
        },
      },
    });

    // Stock movement for sale
    for (const it of sale.items) {
      const p = boleProducts[it.prodIndex];
      await prisma.stockMovement.create({
        data: {
          storeId: boleStore.id,
          productId: p.id,
          movementType: 'SALE',
          quantityDelta: -it.qty,
          unitCostAtTime: p.currentCostPrice,
          referenceId: order.id,
          notes: `Sold on Receipt #${receiptNumber}`,
          createdAt: orderDate,
        },
      });
    }
  }
  console.log(` Seeded ${sampleSales.length} historical completed orders with Telebirr, CBE & Cash`);

  // 3. Create Store #2: Piazza Electronics & Mobile (Trial Store)
  const piazzaStore = await prisma.store.create({
    data: {
      name: 'Piazza Electronics & Mobile',
      slug: 'piazza-electronics',
      phone: '+251944556677',
      address: 'Piazza, Churchill Ave, Addis Ababa',
      currency: 'ETB',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
    },
  });

  const piazzaAdmin = await prisma.user.create({
    data: {
      storeId: piazzaStore.id,
      name: 'Biruk Haile (Owner)',
      email: 'piazza_admin@store.com',
      phone: '+251944556677',
      passwordHash: defaultPasswordHash,
      role: 'STORE_ADMIN',
    },
  });

  const piazzaCashier = await prisma.user.create({
    data: {
      storeId: piazzaStore.id,
      name: 'Marta Assefa',
      email: 'cashier@piazza.com',
      phone: '+251955667788',
      passwordHash: cashierPasswordHash,
      role: 'CASHIER',
    },
  });

  // Electronics Products for Store #2
  const piazzaProducts = [
    { name: 'Samsung 25W Fast Charger USB-C', sku: 'CHG-001', barcode: '7001001', category: 'Accessories', sellingPrice: 850, currentCostPrice: 580, currentStock: 30, lowStockThreshold: 5 },
    { name: 'Oraimo Wireless Bluetooth Earbuds', sku: 'AUD-001', barcode: '7001002', category: 'Audio', sellingPrice: 1600, currentCostPrice: 1150, currentStock: 15, lowStockThreshold: 3 },
    { name: 'SanDisk 64GB Ultra USB 3.0 Flash', sku: 'STR-001', barcode: '7001003', category: 'Storage', sellingPrice: 550, currentCostPrice: 380, currentStock: 45, lowStockThreshold: 8 },
    { name: 'Heavy Duty Power Bank 20000mAh', sku: 'PWR-001', barcode: '7001004', category: 'Accessories', sellingPrice: 2200, currentCostPrice: 1650, currentStock: 12, lowStockThreshold: 4 },
  ];

  for (const p of piazzaProducts) {
    const prod = await prisma.product.create({
      data: {
        storeId: piazzaStore.id,
        ...p,
      },
    });

    await prisma.stockMovement.create({
      data: {
        storeId: piazzaStore.id,
        productId: prod.id,
        movementType: 'INITIAL',
        quantityDelta: p.currentStock,
        unitCostAtTime: p.currentCostPrice,
        notes: 'Initial stock intake',
      },
    });
  }
  console.log(` Created Store #2: ${piazzaStore.name} with ${piazzaProducts.length} items`);

  console.log('\n=============================================================');
  console.log(' SEEDING COMPLETE! Test User Accounts:');
  console.log(' 1. Super Admin:       superadmin@saas.com   / admin123');
  console.log(' 2. Bole Store Admin:  bole_admin@store.com   / admin123');
  console.log(' 3. Bole Cashier 1:    cashier1@bole.com      / cashier123');
  console.log(' 4. Bole Cashier 2:    cashier2@bole.com      / cashier123');
  console.log(' 5. Piazza Admin:      piazza_admin@store.com / admin123');
  console.log(' 6. Piazza Cashier:    cashier@piazza.com     / cashier123');
  console.log('=============================================================\n');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

