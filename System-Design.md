# System Design Document (System-Design.md)

## Project: Multi-Tenant Retail Inventory, POS & Real-Time Analytics SaaS Platform
**Document Version:** 2.0.0 (Updated for Multi-Tenant SaaS)  
**Scale Target:** 2,000+ Independent Store Tenants  
**Architectural Style:** Multi-Tenant Shared-Database / Pooled-Schema Architecture with Row-Level Isolation  
**Primary Stack:** TypeScript / Node.js (Express) + React (Vite) + Tailwind CSS + Prisma ORM + PostgreSQL / SQLite  

---

## 1. Multi-Tenant System Architecture

```mermaid
graph TB
    subgraph Client Tier
        SuperAdminUI["Super Admin Portal<br/>(Platform Metrics, Tenant Directory, Subscription Billing)"]
        StoreAdminUI["Store Admin Hub<br/>(Store Products, Hidden COGS, QR Generator, Staff, Profit)"]
        StorePosUI["Store POS Counter<br/>(Wedge Scanner, Camera, Cart, Ethiopian Split Pay, Thermal Print)"]
    end

    subgraph Edge & Gateway Tier
        Proxy["Reverse Proxy (Nginx / Cloudflare)<br/>SSL Termination, Gzip, Rate Limiting"]
        Gateway["Express Multi-Tenant API Gateway"]
        AuthService["Auth & JWT Service<br/>(Issues Claims: userId, role, storeId)"]
        TenantResolver["Tenant Resolution Middleware<br/>(Extracts storeId & Enforces Query Scoping)"]
        Sanitizer["COGS Security Sanitizer<br/>(Strips cost_price for Cashier role)"]

        Proxy --> Gateway
        Gateway --> AuthService
        Gateway --> TenantResolver
        TenantResolver --> Sanitizer
    end

    subgraph Application Services Tier
        TenantService["Store & Subscription Service"]
        ProductService["Product & Catalog Service (Scoped by storeId)"]
        LedgerService["Stock Movement Ledger Service (Scoped by storeId)"]
        OrderService["Atomic Checkout & Payment Service (Scoped by storeId)"]
        AnalyticsService["Profit & Analytics Engine (Scoped by storeId)"]

        Sanitizer --> TenantService
        Sanitizer --> ProductService
        Sanitizer --> LedgerService
        Sanitizer --> OrderService
        Sanitizer --> AnalyticsService
    end

    subgraph Data Tier (Prisma ORM + PostgreSQL)
        DB[(PostgreSQL Database<br/>Composite Indexes on store_id)]
        ConnectionPool["PgBouncer / Connection Pooler"]

        ProductService --> ConnectionPool
        LedgerService --> ConnectionPool
        OrderService --> ConnectionPool
        AnalyticsService --> ConnectionPool
        TenantService --> ConnectionPool
        ConnectionPool --> DB
    end
```

---

## 2. Multi-Tenancy Data Isolation Strategy (2,000+ Stores)

To host 2,000+ stores affordably on a single modest server without sacrificing security or performance:

### 2.1 The Discriminator Pattern (Row-Level Security)
* Every operational table contains a mandatory `store_id` foreign key.
* **Prisma Query Middleware:** A centralized middleware intercepts all database queries and automatically injects `{ where: { store_id: req.user.storeId } }`.
* **Zero Cross-Tenant Leakage:** A user from Store A (`store_id = 'A'`) cannot execute queries against Store B (`store_id = 'B'`). Attempts to access another store's entities return `404 Not Found` or `403 Forbidden`.

### 2.2 Composite Unique Constraints
* Product barcodes, SKUs, and receipt numbers are unique **per store**, not globally. Two different stores can sell items with the exact same manufacturer barcode without collision:
  ```prisma
  @@unique([store_id, barcode])
  @@unique([store_id, sku])
  @@unique([store_id, receipt_number])
  ```

### 2.3 High-Performance Indexing Strategy for 2,000 Tenants
To keep query execution times below 10ms across 2,000 stores:
1. `CREATE INDEX idx_products_store_barcode ON products(store_id, barcode);`
2. `CREATE INDEX idx_sales_orders_store_date ON sales_orders(store_id, created_at DESC);`
3. `CREATE INDEX idx_stock_movements_store_product ON stock_movements(store_id, product_id, created_at DESC);`

---

## 3. Point-to-Point Detailed Workflows

### Workflow 1: Store Tenant Onboarding & Ethiopian Subscription Activation
```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Store Owner (e.g. Bole Supermarket)
    actor SuperAdmin as Platform Super Admin
    participant Portal as SaaS Portal
    participant API as Multi-Tenant API
    participant DB as Database

    Merchant->>Portal: Registers new store ("Bole Supermarket", Phone: +251911223344)
    Portal->>API: POST /api/tenants/register
    API->>DB: INSERT INTO stores (name, phone, currency: 'ETB', status: 'TRIAL', trial_ends_at)
    API->>DB: INSERT INTO users (role: 'STORE_ADMIN', store_id)
    DB-->>API: Store created
    API-->>Portal: Account initialized (14-Day Free Trial Active)
    Note over Merchant, Portal: 14 days later: Trial expires. Store owner sends 800 ETB via Telebirr
    Merchant->>Portal: Uploads Telebirr Transaction Code "CL9832104"
    Portal->>API: POST /api/tenants/subscription/submit-payment
    API->>DB: INSERT INTO subscriptions (store_id, amount: 800, payment_ref: 'CL9832104', status: 'PENDING')
    SuperAdmin->>Portal: Reviews incoming Telebirr payments in Super Admin Portal
    SuperAdmin->>API: POST /api/super-admin/tenants/:id/activate
    API->>DB: UPDATE stores SET status = 'ACTIVE', subscription_expires_at = NOW() + 30 days
    API-->>Portal: Store activated. Merchant receives SMS/In-app confirmation.
```

---

### Workflow 2: Store Admin Catalog & Hidden Cost Setup
```mermaid
sequenceDiagram
    autonumber
    actor Owner as Store Owner (Bole Supermarket)
    participant UI as Store Admin Hub
    participant API as Backend API
    participant DB as Database

    Owner->>UI: Logs in (bole_admin@store.com)
    UI->>API: POST /api/auth/login
    API-->>UI: JWT payload { userId, role: 'STORE_ADMIN', storeId: 'store_123' }
    Owner->>UI: Navigates to "Product Master" -> Clicks "Add Product"
    Owner->>UI: Enters: "Anchor Milk Powder 400g", SKU: "MILK-001", Barcode: "60012345", Selling: 450 ETB, Cost: 320 ETB, Low Stock: 10
    UI->>API: POST /api/products
    Note over API: Middleware injects store_id = 'store_123'
    API->>DB: INSERT INTO products (store_id, name, sku, barcode, selling_price, current_cost_price)
    API->>DB: INSERT INTO stock_movements (store_id, delta: 0, type: 'INITIAL')
    API-->>UI: 201 Created
    Owner->>UI: Clicks "Generate Printable QR Stickers"
    UI->>Owner: Displays printable 3x8 A4 sticker sheet formatted with QR codes, price in ETB, and product name.
```

---

### Workflow 3: Cashier Counter Checkout with Ethiopian Payment Rails (Split Tender)
```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Store Cashier
    actor Shopper as Retail Customer
    participant POS as POS Counter UI
    participant API as Backend API
    participant DB as Database
    participant Printer as Thermal Printer

    Shopper->>Cashier: Brings goods to the counter
    Cashier->>POS: Scans Item 1 with USB laser barcode gun
    POS->>API: GET /api/products/barcode/60012345 (Header: Bearer Token)
    Note over API: Sanitizer checks role = 'CASHIER' -> STRIPS current_cost_price!
    API-->>POS: Returns { id, name: "Anchor Milk Powder", selling_price: 450, stock: 24 }
    POS->>POS: Item added to cart (Total: 450 ETB)
    Cashier->>POS: Scans Item 2 via camera viewfinder (Biscuit 50 ETB). Total = 500 ETB
    Shopper->>Cashier: "I will pay 200 ETB in Cash and 300 ETB via Telebirr"
    Cashier->>POS: Opens Checkout Modal (Spacebar hotkey):
    Note over POS: Cash Tendered: 200 ETB (Change: 0 ETB)<br/>Telebirr Amount: 300 ETB, Ref Code: "TB-982104"
    Cashier->>POS: Clicks "Confirm & Print Receipt"
    POS->>API: POST /api/orders/checkout { items, payments }
    API->>DB: BEGIN TRANSACTION
    API->>DB: Verify stock >= quantity for store_123
    API->>DB: INSERT INTO sales_orders (store_id: 'store_123', grand_total: 500 ETB)
    API->>DB: INSERT INTO sale_items (stamping historical unit_cost = 320 ETB)
    API->>DB: INSERT INTO payments (method: 'CASH', 200) & (method: 'TELEBIRR', 300, ref: 'TB-982104')
    API->>DB: INSERT INTO stock_movements (delta: -1, type: 'SALE')
    API->>DB: UPDATE products SET current_stock = current_stock - 1 WHERE store_id = 'store_123'
    API->>DB: COMMIT TRANSACTION
    API-->>POS: 201 Created (receiptNumber: "RCP-BOLE-0042")
    POS->>Printer: Sends 58mm/80mm formatted receipt with UTF-8 Amharic/English text & ETB symbols
    POS->>POS: Resets cart and re-arms scanner listener for next shopper
```

---

### Workflow 4: Executive Business Analytics & True Profit Calculation
```mermaid
sequenceDiagram
    autonumber
    actor Owner as Store Owner
    participant UI as Admin Dashboard
    participant API as Backend API
    participant DB as Database

    Owner->>UI: Views Real-Time Dashboard at close of business
    UI->>API: GET /api/analytics/dashboard
    API->>DB: Query sales orders for store_123 for today
    API->>DB: Gross Sales = SUM(grand_total)
    API->>DB: COGS = SUM(sale_items.unit_cost * quantity)
    API->>DB: True Net Profit = Gross Sales - COGS - discounts
    API->>DB: Query dead stock (items with 0 sales in store_123 over 60 days)
    API->>DB: Query low stock (items where current_stock <= low_stock_threshold)
    API-->>UI: Scoped Analytics Payload
    UI-->>Owner: Displays KPI Cards:
    Note over UI: Today's Revenue: 14,850 ETB<br/>Cost of Goods: 9,200 ETB<br/>True Net Profit: 5,650 ETB (38.0% margin)<br/>Low Stock: 4 items (with 1-click restock)<br/>Dead Stock: 2 items
```

---

## 4. Multi-Tenant Database Schema (ERD)

```mermaid
erDiagram
    Store ||--o{ User : "employs"
    Store ||--o{ Product : "owns"
    Store ||--o{ StockMovement : "records"
    Store ||--o{ SalesOrder : "generates"
    Store ||--o{ Subscription : "subscribes"
    
    User ||--o{ SalesOrder : "processed_by"
    User ||--o{ AuditLog : "performed_by"

    Product ||--o{ StockMovement : "tracks"
    Product ||--o{ SaleItem : "sold_in"

    SalesOrder ||--o{ SaleItem : "contains"
    SalesOrder ||--o{ Payment : "settled_by"

    Store {
        string id PK
        string name
        string slug UK
        string phone
        string address
        string currency "ETB"
        string status "ACTIVE | TRIAL | SUSPENDED"
        datetime trial_ends_at
        datetime subscription_expires_at
        datetime created_at
    }

    Subscription {
        string id PK
        string store_id FK
        decimal amount "e.g. 800.00 ETB"
        string billing_cycle "MONTHLY | ANNUAL"
        string payment_method "TELEBIRR | CBE_BIRR | BANK_TRANSFER"
        string payment_reference
        string status "PENDING | APPROVED | REJECTED"
        datetime period_start
        datetime period_end
        datetime created_at
    }

    User {
        string id PK
        string store_id FK "Nullable for SUPER_ADMIN"
        string email UK
        string phone
        string password_hash
        string name
        string role "SUPER_ADMIN | STORE_ADMIN | CASHIER"
        boolean is_active
        datetime created_at
    }

    Product {
        string id PK
        string store_id FK
        string sku
        string barcode
        string name
        string category
        decimal selling_price
        decimal current_cost_price "Hidden from Cashiers"
        int current_stock
        int low_stock_threshold
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    StockMovement {
        string id PK
        string store_id FK
        string product_id FK
        string movement_type "INITIAL | PURCHASE | SALE | DAMAGE | RETURN"
        int quantity_delta
        decimal unit_cost_at_time
        string reference_id "order_id or supplier_invoice"
        string notes
        datetime created_at
    }

    SalesOrder {
        string id PK
        string store_id FK
        string receipt_number
        string cashier_id FK
        decimal subtotal
        decimal discount_amount
        decimal tax_amount
        decimal grand_total
        string status "COMPLETED | VOID | REFUNDED"
        datetime created_at
    }

    SaleItem {
        string id PK
        string order_id FK
        string product_id FK
        string product_name
        int quantity
        decimal unit_price
        decimal unit_cost "Captured historical COGS"
        decimal line_discount
        decimal line_total
    }

    Payment {
        string id PK
        string order_id FK
        string payment_method "CASH | TELEBIRR | CBE_BIRR | MPESA | CARD"
        decimal amount
        decimal tendered
        decimal change_given
        string reference_code "Telebirr / CBE confirmation code"
        datetime created_at
    }

    AuditLog {
        string id PK
        string store_id FK
        string user_id FK
        string action "PRICE_CHANGE | STOCK_ADJUST | ORDER_VOID"
        string entity_type
        string entity_id
        string payload_json
        datetime created_at
    }
```

---

## 5. Security & Multi-Tenancy Invariant Rules

1. **Strict Tenant Query Scoping:** Every SQL/Prisma query against business entities must contain `store_id: req.user.storeId`. Cross-tenant querying is an immediate security fault.
2. **Confidential COGS Rule:** The `cost_price` and derived profit margins are stripped server-side whenever the authenticated user's role is `CASHIER`.
3. **Atomic Sales Transactions:** Checkouts execute in a single ACID transaction (`$transaction`). If stock is insufficient or a payment tender fails, the order and stock deduction are rolled back atomically.
4. **Historical COGS Stamping:** Every `SaleItem` stores a snapshot of the unit purchase cost at the moment of checkout, ensuring historical profitability analytics are never altered by subsequent supplier price increases.
