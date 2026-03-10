# Backend

Express backend (JavaScript) with MongoDB, JWT authentication, and bcrypt password hashing.

## Quick Start

- Default API base URL: `http://localhost:5000/api/v1`
- Health endpoint: `GET /api/v1/health`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`
- Development command: `npm run dev`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   copy .env.example .env
   ```
   Optional for local development profile:
   ```bash
   copy .env.development .env.development.local
   ```
3. Update `.env` values, especially `JWT_SECRET` and `MONGODB_URI`.
4. Run in development:
   ```bash
   npm run dev
   ```

## Environment Variables

Minimum required variables:

- `PORT` - API port (default: `5000`)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - secret used to sign/verify access tokens

Optional but recommended variables:

- `NODE_ENV` - usually `development` or `production`
- `JWT_EXPIRES_IN` - token expiry (default: `1d`)
- `REQUIRE_TRANSACTIONS` - `true`/`false` (defaults to `true` in production)
- `BOOTSTRAP_ADMIN_NAME` - startup seed value applied to the bootstrap admin account
- `BOOTSTRAP_ADMIN_EMAIL` - bootstrap admin email to create or look up at startup
- `BOOTSTRAP_ADMIN_PASSWORD` - bootstrap admin password that is re-hashed and applied at startup
- `BOOTSTRAP_ADMIN_BRANCH` - bootstrap admin branch assignment at startup

The server loads environment files in this order at startup:

1. `.env.<NODE_ENV>` (for example `.env.development`)
2. `.env`

## Project Structure

- `src/server.js` - environment loading, DB bootstrap, and HTTP startup
- `src/app.js` - Express middleware and API mounting
- `src/config/swagger.js` - OpenAPI document definition used by Swagger UI
- `src/routes/` - versioned API route definitions
- `src/controllers/` - HTTP handlers (thin orchestration layer)
- `src/services/` - business logic and transaction-heavy workflows
- `src/models/` - Mongoose schemas/models
- `src/middleware/` - auth, validation, and centralized error handling
- `src/config/` - runtime config, permissions, and DB connection helpers

## API Endpoints

- `GET /api/v1/health` - Health check (includes database transaction support status)
- `POST /api/v1/auth/register` - Register user (optional `role`; defaults to `sales-agent`)
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Current user (Bearer token required)

### Domain Modules

- `GET /api/v1/accounting/overview`
- `GET /api/v1/accounting/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=20`
- `POST /api/v1/accounting/expenses`
- `DELETE /api/v1/accounting/expenses/:id`
- `GET /api/v1/accounting/credit-collections?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/v1/accounting/credit-collections`
- `GET /api/v1/accounting/other-income?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/v1/accounting/other-income`
- `GET /api/v1/accounting/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/procurement/overview`
- `GET /api/v1/procurement/items?search=&lowStock=true&page=1&limit=20`
- `POST /api/v1/procurement/items`
- `POST /api/v1/procurement/inventory-adjustments`
- `POST /api/v1/procurement/damaged-stock`
- `GET /api/v1/procurement/suppliers?search=&page=1&limit=20`
- `POST /api/v1/procurement/suppliers`
- `PATCH /api/v1/procurement/suppliers/:id`
- `DELETE /api/v1/procurement/suppliers/:id`
- `POST /api/v1/procurement/suppliers/:id/payment-actions`
- `POST /api/v1/procurement/purchases` (cash or credit)
- `GET /api/v1/procurement/purchases?paymentType=cash|credit&supplierId=&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/procurement/purchases/:id`
- `GET /api/v1/procurement/stock-report`
- `GET /api/v1/procurement/purchase-report?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/procurement/receipts?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/procurement/reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/sales/dashboard`
- `POST /api/v1/sales/cash-sales`
- `POST /api/v1/sales/credit-sales` (requires `customerId`; customer `tel` + `nin` are linked)
- `GET /api/v1/sales/customers?search=`
- `POST /api/v1/sales/customers`
- `PATCH /api/v1/sales/customers/:id`
- `DELETE /api/v1/sales/customers/:id`
- `GET /api/v1/sales/customers/:id/payments?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /api/v1/sales/customers/:id/payments`
- `GET /api/v1/sales?type=cash|credit&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/sales/:id`
- `GET /api/v1/sales/daily-report?date=YYYY-MM-DD`
- `GET /api/v1/sales/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/report/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/report/export?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/v1/users`
- `GET /api/v1/users/audit-events?module=&action=&actor=&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=20`
- `PATCH /api/v1/users/:id/role?branch=<branch>` - Admin/director callers can manage users in the selected branch scope
- `DELETE /api/v1/users/:id`

## Swagger Docs

- Start backend: `npm run dev`
- Open Swagger UI at `http://localhost:5000/api-docs`
- Raw OpenAPI spec is available at `http://localhost:5000/api-docs.json`

## Notes

- User authentication data is stored in MongoDB using Mongoose.
- Supported roles: `director`, `admin`, `sales-agent`, `manager`.
- Credit sales now update the selected customer's account (`totalCredit`, `totalPaid`, `accountBalance`).
- Customer payments reduce outstanding credit balance and are stored as payment history records.
- Report overview aggregates accounting, procurement, sales, receivables/payables, and top-selling items.
- Critical multi-step writes now run inside MongoDB transactions (sales creation, customer payment posting, stock adjustments, damaged stock, supplier payments) to prevent partial updates.
- Immutable audit events are recorded for critical sales/procurement/customer account operations and can be reviewed by authorized roles.
- Procurement purchases support `cash` and `credit`: cash updates stock and records supplier purchase, credit also increases supplier payable balance (`supplier.balance`) by remaining due amount.
- Centralized request validation middleware now guards critical write endpoints before business logic.
- Supplier payment now strictly blocks overpayment and payment when no outstanding supplier balance exists.
- Purchase report now uses procurement purchase records as source-of-truth.
- Startup verifies MongoDB transaction support. Set `REQUIRE_TRANSACTIONS=true` to fail fast when unsupported (recommended for production). Use `false` for local standalone MongoDB development.

## Role Access Matrix

- `director`: full access to all modules/actions.
- `admin`: full operations for accounting, procurement, sales, reports, and users.
- `manager`: operations for procurement/sales, view+export for accounting/reports, users view.
- `sales-agent`: sales operations + report view.

## Bruno Collection

- Collection folder: `bruno/`
- Open Bruno and select **Open Collection** -> choose `Backend/bruno`.
- Use environment file: `bruno/environments/Local.bru`
- Set these variables before running secured requests:
   - `baseUrl` = `http://localhost:5000/api/v1`
   - `token` = JWT from login response
   - ids (`customerId`, `supplierId`, `itemId`, etc.) from created records

### First request sanity check

Use this after starting the server:

```bash
curl http://localhost:5000/api/v1/health
```

### Suggested run order

1. `00-Health/Health Check`
2. `01-Auth/Register`
3. `01-Auth/Login`
4. Copy `data.token` into `token` variable in Local environment
5. Run module requests under Sales / Procurement / Accounting / Reports / Users

