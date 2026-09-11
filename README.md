# 🚀 IntelligenSpace Hub — Architecture

Autonomous AI Fleets, Multi-Model Routing & Enterprise Voice Telephony Operations Platform.

## 1. Overview

A multi-tenant SaaS monorepo with two independently deployable services:

| Service | Stack | Port |
|---|---|---|
| **Frontend** | TanStack Start (React 19), Tailwind v4, Radix UI, Recharts | `8080` |
| **Backend API** | Node.js + Hono, PostgreSQL (Neon), JWT/API-key auth | `3001` |

AI conversations are routed through **OpenRouter** to 13+ models. Everything is scoped to a **workspace** (tenant), with Docker Compose orchestrating both services + migrations in one command.

## 2. High-Level Diagram

```
Browser ──HTTPS──▶ Frontend (TanStack Start · :8080)
                        │ REST/JSON  /api/v1/*
                        ▼
              Backend API (Hono · :3001)
   ┌─────────────────────────────────────────┐
   │ Middleware: CORS → logger → secureHeaders │
   │            → auth → RBAC → rate-limit     │
   ├─────────────────────────────────────────┤
   │        Routes → Services → DB Client       │
   └─────────────────────────────────────────┘
                 │                    │
                 ▼                    ▼
        PostgreSQL (Neon)      OpenRouter AI API
        multi-tenant data      13+ routed models
```

## 3. Request Flow

1. Client sends `Authorization: Bearer <token>`.
2. `authMiddleware` accepts either a **JWT** (web session) or an **API key** (`sk_live_…`/`sk_test_…`, SHA-256 hashed & looked up), attaching `{ id, email, workspaceId, role/permission }` to context.
3. `requireAdmin` / `requireRole` / `rateLimitMiddleware` enforce authorization + abuse limits per route.
4. Route handler → **service module** (`*.service.js`) → pooled Postgres client.
5. Centralized `onError` returns `{ error: string }` with proper HTTP status.

## 4. Backend Structure

```
backend/src/
├── app.js              # Hono app factory, middleware & route mounting
├── index.js             # Bootstrap, graceful shutdown, webhook retry worker
├── config/env.js         # Env loading & startup validation
├── db/
│   ├── schema.js         # All CREATE TABLE / ALTER TABLE SQL
│   ├── client.js         # Pooled pg client
│   ├── migrate.js        # Runs schema + seeds
│   └── seed-templates.js
├── middleware/
│   ├── auth.js           # JWT + API key resolution
│   ├── rbac.js            # requireAdmin / requireRole
│   ├── rate-limit.js      # In-memory sliding window limiter
│   └── error-handler.js
├── routes/                # 20 resource route files (see §6)
│   ├── admin/              # models, users, workspaces
│   └── developer/          # projects, ai-agents, index
├── services/               # Business logic (auth, agent, call, dashboard,
│                            #   event, openrouter, order, webhook)
└── utils/                  # jwt, hash, pagination, ssrf guard, webhook-crypto
```

## 5. Multi-Tenancy Model

- `users` ↔ `workspace_members` ↔ `workspaces` (role: `owner`/`member`).
- Every business table (`agents`, `calls`, `orders`, `webhooks`, …) carries `workspace_id` with `ON DELETE CASCADE`.
- `agent_id` FKs use `ON DELETE SET NULL` to preserve history after an agent is deleted.
- Every query is scoped by the caller's `workspaceId` for tenant isolation — one database, many tenants.

## 6. Database Schema (18 tables)

| Table | Purpose |
|---|---|
| `users` | Accounts; local + Google OAuth (`google_id`, `auth_provider`) |
| `workspaces` | Tenant: plan, credits, region, owner |
| `workspace_members` | Membership + role |
| `agents` | AI agent config: model, voice, prompt, tone, tools (JSONB), stats |
| `agent_templates` | Seeded reusable presets |
| `phone_numbers` | Provisioned numbers, capabilities, agent assignment |
| `calls` | Call log: direction, duration, cost, recording, transcript (JSONB), sentiment |
| `appointments` | Scheduled appointments captured by agents |
| `products` | Catalog/inventory |
| `orders` | Orders, line items + timeline (JSONB) |
| `webhooks` / `webhook_deliveries` | Outbound event subscriptions + delivery log/retries |
| `api_keys` | Hashed keys, permission (`read`/`write`), usage counters |
| `usage_records` | Billing ledger with running balance |
| `notifications` | Per-user/workspace feed |
| `developer_projects` | Connected repos for AI code tools |
| `ai_tasks` / `dev_activity` | Async AI dev-tool task queue + activity feed |
| `system_ai_models` | Admin-managed model catalog (13+ seeded models) |

All JSONB-heavy fields (`tools`, `transcript`, `items`, `events`, `result`) keep the schema flexible without extra join tables. Migrations are idempotent (`IF NOT EXISTS`), so `db:migrate` is safe to re-run on every deploy.

## 7. Authentication & Authorization

- **JWT** — issued on login/register/Google OAuth, signed with `JWT_SECRET`.
- **API Keys** — `sk_live_…`/`sk_test_…`, SHA-256 hashed, `read`/`write` scoped (mutations blocked for `read`-only keys).
- **Google OAuth 2.0** — redirect flow (`/auth/google`, `/auth/google/callback`) and in-app token verify (`/auth/google/verify`).
- **RBAC** — `requireRole([...])` resolves role from JWT or `workspace_members`; `requireAdmin()` restricts `/admin/*` to one exact `ADMIN_EMAIL` regardless of workspace role.
- **Rate limiting** — in-memory per-IP sliding window on auth + webhook mutation routes (swap for Redis at scale).

## 8. API Surface (`/api/v1`)

| Domain | Routes |
|---|---|
| `auth` | register, login, me, google (redirect/callback/verify) |
| `workspaces` | list, update |
| `dashboard` | metrics, activity, series |
| `agents` | CRUD, status, stats, chat |
| `templates` | list, get |
| `phone-numbers` | list, assign |
| `calls` | web-call, phone-call, log, list, recordings, detail |
| `appointments` | CRUD |
| `catalog` | CRUD (products) |
| `orders` | CRUD + status |
| `webhooks` | CRUD, test, deliveries |
| `api-keys` | list, create, revoke |
| `usage` | records, balance, topup |
| `team` | list, invite, role, remove |
| `notifications` | list, read, read-all |
| `developer` | limits, tasks, activity, projects CRUD, 7 AI tools (code-review, debug, coding, architecture, tests, security, documentation) |
| `admin/*` | models (CRUD + test), users (list/role/delete), workspaces (list, credits) — `ADMIN_EMAIL` only |
| system | `/`, `/health`, `/demo` (mock test site) |

## 9. Frontend Structure

```
frontend/src/
├── routes/       # File-based pages (TanStack Router dot-notation)
├── components/   # developer/, landing/, layout/, shared/, ui/ (shadcn+Radix)
├── services/      # API client layer
├── hooks/, lib/mcp/, types/
```

Key route groups: `agents.*`, `calls.*`, `orders.*`, `developer.projects.$id.*` (7 AI-tool tabs), `admin.models`, `webhooks`, `api-keys`, `usage`, `team`, `settings`.

## 10. AI Model Routing

`services/openrouter.service.js` wraps an OpenAI-compatible client against `OPENROUTER_BASE_URL`. `system_ai_models` seeds a free auto-router (`openrouter/free`) plus free/Pro/Frontier-tier models (Google, NVIDIA, Cohere, Poolside, Nex-AGI, LiquidAI, OpenAI, Anthropic). Admins manage the catalog via `/admin/models`.

## 11. Deployment

```bash
docker compose up --build
```

- `backend` container runs `node src/db/migrate.js && node src/index.js` — safe to re-run (idempotent schema).
- `frontend` container builds a Nitro server bundle, waits on backend's `/health` check (`condition: service_healthy`) before starting.
- CORS allow-list: `localhost:*`, `FRONTEND_URL`, plus `*.vercel.app` / `*.onrender.com` / `*.pages.dev` for preview deploys.

**Production checklist**: strong `JWT_SECRET` · real `DATABASE_URL` (SSL) · valid `OPEN_ROUTER_KEY` · correct `FRONTEND_URL` · Google OAuth vars if used · replace in-memory rate limiter with Redis for multi-instance scaling.

## 12. Security Notes

- Passwords hashed with `bcryptjs`; `password_hash` nullable for OAuth-only accounts.
- API keys stored only as SHA-256 hash + masked display value.
- `secureHeaders()` hardening on every response.
- SSRF guard (`utils/ssrf.js`) validates outbound webhook URLs.
- Admin Console gated by exact-match email, independent of workspace role.
