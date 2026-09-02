# Equipment Rental — Backend

Node/Express/TypeScript REST API for the EquipFlow equipment rental platform. ESM throughout, Drizzle ORM over PostgreSQL.

## Tech stack

- **Runtime**: Node.js, Express, TypeScript (ESM, `tsx` for dev/watch)
- **Database**: PostgreSQL via Drizzle ORM (`drizzle-kit` for migrations/studio)
- **Auth**: JWT (`jsonwebtoken`, `bcrypt`)
- **Validation**: Zod
- **Testing**: Vitest (unit) + Playwright (API E2E)
- **Docs**: Swagger/OpenAPI, generated from JSDoc on route files
- **Other**: `pino`/`pino-http` logging, `helmet`, `cors`, `express-rate-limit`, `nodemailer` + Handlebars email templates, `node-cron`, Sentry (optional)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file with at least:

   ```
   DATABASE_URL=postgresql://user:password@host/db
   JWT_SECRET=a-long-random-secret
   ```

   Optional variables: `JWT_EXPIRES_IN`, `PASSWORD_RESET_EXPIRES_MINUTES`, `FRONTEND_URL`, `SMTP_USER`, `SMTP_PASS`, `SENTRY_DSN`. All variables are validated at startup by `src/config/env.ts`; the process exits if a required variable is missing or invalid.

3. Apply database migrations:

   ```bash
   npm run migrate
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

The API listens on `PORT` (default `3000`) and exposes a health check at `GET /health`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the API with `tsx watch` against `src/server.ts` (hot reload) |
| `npm run build` | Type-check and compile via `tsc` to `dist/` |
| `npm start` | Run the compiled `dist/server.js` (run `build` first) |
| `npm test` | Full suite: Vitest unit tests, then the Playwright E2E suite |
| `npm run test:unit` / `test:unit:watch` | Vitest unit tests only (mocks the repository/db layer, no network/DB needed) |
| `npm run test:e2e` | Playwright API tests against a real running server on a `.env.test` database branch |
| `npm run db:test:setup` | Migrate + seed the test database branch (destructive — truncates all app tables, only ever targets `.env.test`) |
| `npm run migrate:generate` | Generate a Drizzle migration from schema changes in `src/database/schema/schema.ts` |
| `npm run migrate` | Apply pending Drizzle migrations |
| `npm run migrate:studio` | Open Drizzle Studio against `DATABASE_URL` |

Run a single unit test file with:

```bash
npx vitest run src/test/unit/services/auth.service.test.ts
```

E2E and seed scripts load `.env.test` (see `.env.test.example`) via `dotenv-cli`, pointed at a separate test-only database branch, never the dev/prod one. All rate limiters no-op when `NODE_ENV=test` so the E2E suite isn't throttled.

## Architecture

Layered, feature-sliced Express app. Request flow for every resource follows the same path:

```
routes (src/api/routes) → middleware (auth / validate / rate-limit) → controller (src/api/controller) → service (src/service) → repository (src/database/repository) → Drizzle → PostgreSQL
```

- **`src/core/kernel.ts`** wires everything: body parsing, `helmet`/`cors`/`pino-http`, the health check, the aggregated API router (`src/api/routes/index.ts`, mounted under `/users`, `/auth`, `/equipments`, `/rental-bookings`, `/category`, `/rentals`, `/admin/rentals`, `/admin/rental-bookings`, `/fines`), Swagger, and the global error handler. `src/app.ts` instantiates `Kernel` and exports the Express app; `src/server.ts` starts the HTTP listener.
- **Controllers** are thin: pull data off `req`, call one or more services, wrap the result with `successResponse`/`errorResponse` (`src/helpers/res.helper.ts`), and forward errors to `next(error)`.
- **Services** (`src/service/*.service.ts`) hold business logic and orchestrate one or more repositories; they throw `AppError(statusCode, message)` (`src/util/appError.ts`) for expected failure cases. The global `errorHandler` middleware converts an `AppError` into a JSON error response and logs anything else as an unhandled 500 via `pino`.
- **Repositories** (`src/database/repository/*.repository.ts`) are the only layer that talks to the DB, using the shared `db` instance from `src/database/db-connection.ts`. All tables are soft-delete (`isDeleted`/`deletedAt` columns) — repositories filter these out rather than issuing hard deletes.
- **Schema** lives entirely in `src/database/schema/schema.ts`; cross-table relations are defined in `src/database/relations.ts`.
- **Auth**: JWT-based. `src/middlewares/auth.middleware.ts` exposes `auth` (any authenticated user) and `isAdmin` (requires `role === "ADMIN"`). The decoded token is attached to `req.user`.
- **Validation**: Zod schemas in `src/api/validators/*.schema.ts`, applied per-route via the `validate(schema)` middleware.
- **Rate limiting**: per-feature limiters in `src/middlewares/ratelimiter/`, applied at the route level.
- **Rental booking lifecycle**: a booking moves through `active → return_requested → returned`; returns are handled by a dedicated `return.controller`/`return.service`/`return.repository` trio, mounted both user-facing (`/rentals`) and admin-facing (`/admin/rentals`).
- **Cron**: `src/cron/cron.scheduler.ts` schedules a reminder email job every 10 minutes for rentals approaching their due date.
- **Email**: `nodemailer` transport in `src/util/nodemailer.ts`; templated emails (OTP, booking reminders, password reset) rendered via Handlebars templates in `mail-template/` at the repository root.

## API docs

Swagger/OpenAPI docs are generated from JSDoc comments on route files (`src/config/swagger.ts` + `swagger-doc/*.yaml`) and served when the app boots.
