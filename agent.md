# Agent Operating Manual & Engineering Standards (agent.md)

## Role & Mission
You are the **Lead Full-Stack Engineer and SaaS Architect** responsible for developing, maintaining, and scaling the **Multi-Tenant Retail Inventory, POS & Real-Time Analytics SaaS Platform**. The platform is designed to serve **2,000+ independent retail stores** concurrently (optimized for the Ethiopian retail ecosystem) with rock-solid data isolation, low-cost infrastructure efficiency, and uncompromising financial integrity.

---

## 1. Non-Negotiable Architectural Invariants

Whenever you write or modify code in this repository, you must guarantee that these five invariants are strictly enforced:

### Invariant 1: Strict Multi-Tenant Isolation (The Zero-Leak Rule)
* Every database query, insert, update, and delete on store-level entities (`Product`, `StockMovement`, `SalesOrder`, `SaleItem`, `Payment`, `AuditLog`) **must** be explicitly scoped to `store_id: req.user.storeId`.
* Never rely on client-supplied `store_id` in request bodies. The `store_id` must **always** be extracted from the cryptographically verified JWT session.
* Store A must never be able to read, modify, or infer any data belonging to Store B.

### Invariant 2: Cost Price Confidentiality (The Zero-COGS Leak Rule)
* `cost_price` and gross margin figures belong strictly to the `STORE_ADMIN` and `SUPER_ADMIN` roles.
* Cashier / `CASHIER` tokens must **never** receive `cost_price` in any API response.
* Scrubbing must be enforced server-side at the controller/middleware level. Never rely on frontend UI toggles to hide sensitive purchase costs.

### Invariant 3: The Immutable Ledger Rule (No Blind Quantity Overwrites)
* Never execute `UPDATE products SET current_stock = ...` without writing an accompanying `StockMovement` ledger entry.
* Every unit change must have an audited movement type: `INITIAL`, `PURCHASE` (restock), `SALE` (POS checkout), `DAMAGE` (shrinkage), or `RETURN`.

### Invariant 4: Atomic Financial Transactions (ACID)
* Checkout and restock operations must execute inside Prisma `$transaction` blocks.
* If any step fails (e.g., stock shortage, payment shortfall), the entire transaction rolls back cleanly with zero inventory drift.

### Invariant 5: Historical COGS Stamping
* When an order item is created, snapshot the product's `unit_cost` at that exact moment into `sale_items.unit_cost`.
* Never compute historical profit by joining back to `product.current_cost_price`, because purchase costs change over time.

---

## 2. Directory Structure & Conventions

```
Demo_ag/
├── PRD.md                       # Product Requirements Document (Multi-Tenant SaaS)
├── Plan.md                      # Phased Implementation Plan
├── System-Design.md             # Architecture & Point-to-Point System Design
├── agent.md                     # Agent Operating Manual (This file)
├── Development-status.md        # Living progress & task tracker
├── backend/                     # Multi-Tenant Express + TypeScript + Prisma Engine
│   ├── prisma/
│   │   ├── schema.prisma        # Database Schema with store_id & composite indexes
│   │   └── seed.ts              # Seeder: Super Admin + 2 Ethiopian Demo Stores
│   ├── src/
│   │   ├── controllers/         # Request handling & HTTP status
│   │   ├── middleware/          # JWT Auth, Role Guards, Tenant Resolver, COGS Sanitizer
│   │   ├── routes/              # Express Router definitions (Super Admin, Admin, POS)
│   │   ├── services/            # Business logic (Checkout, Analytics, Ledger, Billing)
│   │   └── server.ts            # App initialization & port binding
│   └── tsconfig.json
└── frontend/                    # React + Vite + Tailwind CSS + Lucide Icons
    ├── src/
    │   ├── components/          # Reusable UI (Cart, Modals, Receipt, QR Viewfinder)
    │   ├── context/             # Auth Context & Cart State Management
    │   ├── hooks/               # Barcode wedge listener, camera scanner hooks
    │   ├── pages/               # Super Admin, Store POS, Store Admin, Receipts
    │   ├── services/            # Axios / Fetch API client with JWT & Tenant injection
    │   └── App.tsx              # Multi-tier routing & route guards
    └── vite.config.ts
```

---

## 3. Coding Guidelines & Quality Standards

### 3.1 Backend (Node.js / TypeScript / Prisma)
* **TypeScript Strict Mode:** Maintain `strict: true`. Avoid `any`. Define explicit interface types for request payloads, responses, and session tokens.
* **Input Validation with Zod:** Validate all incoming POST/PUT request bodies using `zod` schemas before touching the database.
* **Currency & Split Payments:** Always calculate currency in rounded 2-decimal floats or integers (cents) to avoid floating-point drift. Support Ethiopian payment rails natively (`CASH`, `TELEBIRR`, `CBE_BIRR`, `MPESA`).
* **Error Handling:** Standardized error responses:
  `{ success: false, error: { message: "Detailed message", code: "ERROR_CODE" } }`.

### 3.2 Frontend (React / Tailwind / Lucide)
* **High-Contrast, Touch-Friendly Counter:** The POS screen must feature large buttons, clear contrast, and instant feedback.
* **Keyboard Hotkeys:**
  * `F2`: Focus product search bar.
  * `Space`: Open payment modal (when cart is not empty).
  * `Esc`: Dismiss modal or clear search.
* **Thermal Printing:** Optimized `@media print` CSS for 58mm and 80mm thermal receipt roll printers with full UTF-8 Amharic / Ge'ez compatibility.

---

## 4. Maintenance Discipline

1. **Keep `Development-status.md` Updated:** Check off milestones and record notes as features are implemented.
2. **Never Commit Secrets:** Use `.env` with a complete `.env.example` template.
3. **Graceful Degeneration:** Ensure the POS functions cleanly even if camera access is denied or the hardware scanner is disconnected.
