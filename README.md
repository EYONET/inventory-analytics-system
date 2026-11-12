# Multi-Tenant Retail Inventory, POS & Real-Time Analytics SaaS Platform
> Engineered for 2,000+ Independent Store Tenants & Optimized for the Ethiopian Retail Ecosystem.

---

## 1. Quick Overview

This platform provides:
* **High-Speed Counter POS:** Sub-50ms barcode scanning (USB laser wedge listener + webcam QR scanner), tactile cart controls, discount limits, and 58mm/80mm thermal receipt printing.
* **Ethiopian Split Payments:** Split tender with Cash (quick ETB buttons + change calculator), **Telebirr**, **CBE Birr**, and **Safaricom M-Pesa Ethiopia**.
* **Store Admin Analytics & Inventory Hub:** Real-time True Net Profit calculation via snapshot Cost of Goods Sold (COGS), low-stock alert badges, dead-stock clearance planner (>30 days zero sales), and printable QR code sticker sheets (A4 3x8 grid).
* **Super Admin SaaS Operator Portal:** Oversee 2,000+ stores, monitor platform Gross Merchandise Volume (GMV), review Telebirr subscription payments, and manage store activations.
* **Strict Tenant Isolation:** Row-level multi-tenancy with composite indexes `[store_id, barcode]` and server-side COGS masking for cashier accounts.

---

## 2. Connecting to Supabase

1. Create a free project on [supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **Database** -> **Connection string**.
3. Open `backend/.env` and paste your Supabase connection strings:
   ```env
   # Transaction Pooler (port 6543)
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true"

   # Direct Connection (port 5432)
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   ```
4. Push the schema to your Supabase PostgreSQL database:
   ```bash
   cd backend
   npx prisma db push
   ```
5. Seed realistic Ethiopian retail demo stores:
   ```bash
   npm run prisma:seed
   ```

---

## 3. Launching the Platform

### Terminal 1: Backend API (Port 5000)
```bash
cd backend
npm run dev
```

### Terminal 2: Frontend Counter POS & Admin (Port 3000)
```bash
cd frontend
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 4. Pre-Configured Demo Accounts

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@saas.com` | `admin123` | Platform-wide SaaS metrics, 2,000+ stores directory, Telebirr subscriptions |
| **Bole Store Admin** | `bole_admin@store.com` | `admin123` | Store #1 Owner Hub, private COGS, inventory restock, profit analytics, QR stickers |
| **Bole Cashier 1** | `cashier1@bole.com` | `cashier123` | Store #1 POS counter, fast scanning, split payments, thermal receipt print |
| **Piazza Store Admin**| `piazza_admin@store.com`| `admin123` | Store #2 Electronics Owner Hub (completely isolated data) |

