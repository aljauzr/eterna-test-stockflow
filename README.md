# StockFlow Monorepo

Initial scaffold for the StockFlow take-home test with a monorepo structure:

- `packages/frontend`: Next.js App Router for the minimal UI
- `packages/backend`: basic NestJS API with MongoDB connection

## Running The Project

1. Copy `.env.example` to `.env` in the root if needed.
2. Make sure Yarn is available. If it is not installed yet, run:

```bash
corepack enable
corepack prepare yarn@1.22.22 --activate
```

3. Install dependencies:

```bash
yarn install
```

4. Start the frontend:

```bash
yarn dev:frontend
```

5. Start the backend:

```bash
yarn dev:backend
```

## Current Scope Notes

- The frontend is still an initial UI and is not connected to the backend yet
- The backend currently provides NestJS bootstrap, a health check, and MongoDB initialization
- Auth, product, and invoice features have not been implemented at this stage yet
