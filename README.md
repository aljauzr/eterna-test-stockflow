# StockFlow

StockFlow is a minimal inventory and invoicing system built for the full-stack JavaScript take-home exercise. It covers secure authentication, product management, invoice creation, stock movements on invoice status changes, and a small reviewer-friendly UI for validating the core business rules quickly.

## Stack

- Frontend: Next.js 15 + React 19
- Backend: NestJS 11
- Database: MongoDB + Mongoose
- Language: TypeScript
- Package manager: Yarn workspaces
- Styling: CSS Modules

## Repository Structure

```text
packages/
  backend/   NestJS API
  frontend/  Next.js App Router UI
```

## Prerequisites

- Node.js 20+ recommended
- MongoDB running locally
- Corepack enabled so Yarn 1.22.22 can be used consistently

## Setup

1. Enable Corepack if Yarn is not available yet:

```bash
corepack enable
corepack prepare yarn@1.22.22 --activate
```

2. Install dependencies:

```bash
yarn install
```

3. Copy the environment file:

```bash
copy .env.example .env
```

If you already have a `.env`, make sure the values match the variables listed below.

4. Make sure MongoDB is running locally on:

```bash
mongodb://localhost:27017/stockflow
```

5. Seed demo data:

```bash
yarn seed
```

6. Start the backend:

```bash
yarn dev:backend
```

7. In a separate terminal, start the frontend:

```bash
yarn dev:frontend
```

8. Open the app:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:3001/api
```

## Environment Variables

The root `.env.example` contains all required variables:

```bash
MONGODB_URI=mongodb://localhost:27017/stockflow
PORT=3001
NODE_ENV=development
JWT_SECRET=replace-this-with-a-long-random-string
JWT_EXPIRES_IN=1d
INVOICE_TAX_RATE_PERCENT=11
NEXT_PUBLIC_APP_NAME=StockFlow
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

Notes:
- `JWT_SECRET` should be replaced with a real secret in local/private environments.
- `INVOICE_TAX_RATE_PERCENT` controls invoice tax calculation and the tax label shown in the UI.

## Demo Credentials

After running `yarn seed`, use this reviewer account:

```text
Email: reviewer@stockflow.local
Password: Stockflow123!
```

## Seed Data

The seed script is designed to help a reviewer validate the requirements quickly:

- 9 products to exercise list pagination and search
- 7 invoices across `DRAFT`, `ISSUED`, `PAID`, and `CANCELLED`
- draft invoices that share the same product stock, so stock guard behavior can be tested when issuing invoices
- products already referenced by invoices, so delete protection can be verified from the inventory page

The seed is idempotent for the demo user: re-running `yarn seed` resets the demo data for that account to a known state.

## Available Scripts

At the repository root:

```bash
yarn dev:frontend
yarn dev:backend
yarn seed
yarn build
yarn lint
```

Package-specific scripts:

- Frontend: `yarn workspace @stockflow/frontend dev|build|start|lint`
- Backend: `yarn workspace @stockflow/backend start:dev|build|start|seed|lint`

## Feature Summary

### Authentication

- Register with email and password
- Login with JWT-based authentication
- Logout invalidates the current token version from the app's point of view
- Protected dashboard, inventory, and invoice routes
- Per-user data isolation for products and invoices

### Inventory

- Create, update, list, search, paginate, and delete products
- SKU uniqueness enforced per user
- Description limited to 150 characters
- Products referenced by invoices cannot be deleted
- Suggested sequential SKU generation for new products

### Invoices

- Create and update draft invoices with one or more line items
- Server-side calculation of subtotal, tax, and total
- Product name and price are snapshotted onto invoice items
- Draft -> Issued decrements stock
- Issued -> Cancelled restores stock
- Draft -> Cancelled restores nothing
- Status transitions enforced server-side
- Live summary shown in the invoice form drawer

## API Overview

All protected endpoints require `Authorization: Bearer <token>`.

| Area | Method | Endpoint | Notes |
|---|---|---|---|
| Auth | `POST` | `/api/auth/register` | Register a new user |
| Auth | `POST` | `/api/auth/login` | Login and receive access token |
| Auth | `POST` | `/api/auth/logout` | Invalidate current token version |
| Auth | `GET` | `/api/auth/me` | Get current user |
| Products | `GET` | `/api/products` | List products with pagination and search |
| Products | `POST` | `/api/products` | Create product |
| Products | `GET` | `/api/products/catalog` | Product list for invoice item selection |
| Products | `GET` | `/api/products/suggested-sku` | Get next sequential SKU |
| Products | `PATCH` | `/api/products/:productId` | Update product |
| Products | `DELETE` | `/api/products/:productId` | Delete product if not referenced by invoices |
| Invoices | `GET` | `/api/invoices` | List invoices with pagination and status filter |
| Invoices | `POST` | `/api/invoices` | Create invoice |
| Invoices | `GET` | `/api/invoices/:invoiceId` | Get invoice detail |
| Invoices | `PATCH` | `/api/invoices/:invoiceId` | Update draft invoice |
| Invoices | `PATCH` | `/api/invoices/:invoiceId/status` | Change invoice status |

## Error Response Shape

The backend returns a consistent JSON structure for application errors:

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "errors": {
    "sku": ["SKU already exist."]
  }
}
```

This shape is used so the frontend can surface field-level and form-level errors consistently.

## Tech Choices And Why

- **Next.js App Router** for a small but structured frontend with route protection and component reuse.
- **NestJS** for clear module boundaries, DTO validation, and predictable controller/service architecture.
- **MongoDB + Mongoose** because the exercise allowed MongoDB and it made iteration on document shapes fast.
- **TypeScript** to keep backend rules and frontend form state safer during fast development.
- **JWT auth with token versioning** so logout can invalidate prior tokens without building a full refresh-token flow.
- **CSS Modules** to keep styles local to each component and avoid inline styling noise.
- **Yarn workspaces** to keep frontend and backend in one repo with simple shared commands.
- **Integer minor units for invoice totals** so invoice money calculations avoid floating-point errors.
- **Playwright E2E tests in `packages/e2e`** to validate the main reviewer flows against the running app.

## Trade-Offs And Known Limitations

- API documentation is provided as an endpoint table in this README instead of Swagger/Postman.
- Money handling is strict on invoices, but product `unitPrice` is still stored as a number before being converted into minor units for invoice snapshots.
- The app targets local development only; there is no deployment or Docker setup in this version.
- Concurrency handling for simultaneous issue attempts is limited to the implemented business checks and rollback logic; it is not a full isolation/locking solution.

## What I Would Do With One More Week

- Add the required automated tests for auth, protected routes, and invoice stock transitions.
- Add Swagger or a Bruno/Postman collection for easier API review.
- Add `docker-compose` for one-command local setup.
- Improve concurrency handling for stock updates under simultaneous issue requests.
- Add CI to run lint and tests automatically on each push.
- Refine accessibility details and keyboard interactions across drawers, dialogs, and tooltips.

## End-To-End Tests

Playwright tests live in:

```text
packages/e2e
```

Install Playwright browser binaries once after dependency installation:

```bash
yarn workspace @stockflow/e2e exec playwright install
```

Run the E2E suite:

```bash
yarn test:e2e
```

Run it in headed mode:

```bash
yarn test:e2e:headed
```

Current coverage includes:

- wrong-password login rejection
- unauthenticated protected API request returns `401`
- invoicing above available stock is rejected
- issuing a draft invoice decrements stock
- cancelling an issued invoice restores stock

## AI Usage

I used two AI tools during development:

- **Trae AI Pro** as the primary coding assistant to build, refactor, and iterate on the application code across the frontend and backend.
- **ChatGPT Free** to discuss better solution options and more optimized approaches, especially to help make the prompts I gave to Trae AI Pro more efficient and directed.

Both tools were used as development assistants. The final code, debugging process, and implementation decisions were still reviewed and adjusted manually in the local workspace.

## Time Spent

Approximately 7 hours.
