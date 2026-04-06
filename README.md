# Amazon Affiliate Automation Platform (Node.js Path)

Production-ready starter monorepo for an Amazon affiliate website with:

- Next.js (App Router, TypeScript, TailwindCSS)
- Express API + Prisma ORM
- MySQL or PostgreSQL
- Redis caching
- WordPress REST integration
- Amazon Product Advertising API integration module
- n8n-friendly automation endpoints

## Monorepo Structure

```text
/frontend            # Next.js storefront + admin UI
/backend             # Express API + auth + automation endpoints
/database            # Database docs + schema mirror
/services            # Integration service contracts/documentation
/automation          # n8n workflow examples
/components          # Shared component references
/pages               # Legacy routing references (optional)
/api                 # API documentation and collection
/utils               # Shared utility references
```

## Quick Start

1. Install dependencies (**from the repository root** — npm workspaces hoist a single `react` / `react-dom`, which avoids `useContext` errors in the combined server):

```bash
npm install
npm dedupe
```

2. Configure environment files:

- `backend/.env` (copy from `backend/.env.example`)
- `frontend/.env.local` (copy from `frontend/.env.example`)

3. Setup database:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

4. Run apps:

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`

## Hostinger Node.js Deployment (One Application)

Use repository root deployment with one Node process serving both Next.js and Express. The root `package-lock.json` is the only lockfile: do **not** run `npm install` only inside `backend/` or `frontend/` on the server, or you can get duplicate React copies and styled-jsx / `useContext` crashes.

Hostinger app settings:

1. Root directory: repository root (`/`)
2. Build command:

```bash
npm run build
```

3. Start command:

```bash
npm run start
```

4. Node version: `20.x`

Required environment variables:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `AUTOMATION_API_KEY`
- `FRONTEND_URL` (set to your production domain)
- `REDIS_URL` (optional, falls back to in-memory cache)
- WordPress/Amazon credentials (optional until integrations are enabled)

Copy-paste template: `HOSTINGER_ENV_TEMPLATE.md`

Combined runtime entrypoint: `backend/src/combined-server.ts`

## Exact Hostinger Values

- Root directory: `/`
- Build command: `npm run build`
- Start command: `npm run start`
- Node version: `20.x`

## Security

- JWT admin authentication
- Automation API key authentication
- Rate limiting
- Input validation with Zod
- Secure affiliate redirect tracking

## Automation Endpoints

- `POST /automation/generate-article`
- `POST /automation/update-prices`
- `POST /automation/add-products`
- `POST /automation/publish-post`

Each endpoint writes to `automation_logs`.

## Notes

- Amazon PA API signature logic is stubbed for secure server-side implementation.
- WordPress integration uses application passwords via REST API.
- Replace placeholder AI generation with your preferred provider.

## Prisma Schema Location

- Runtime schema used by backend commands: `backend/prisma/schema.prisma`
- Mirror copy kept for requested project structure: `database/prisma/schema.prisma`
