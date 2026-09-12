---
title: Configuration
---

# Configuration

No `.env` file is required to boot the api or web app locally — both have code-level defaults
for local development. This page lists what each var controls and its default, sourced from
`apps/api/src/common/config/default.ts`, `apps/api/.env.example`, and `apps/web/.env.example`.

## `apps/api`

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `local` | Controls TypeORM `synchronize` — on for `local`/`development`, off for `staging`/`production`. See [Architecture](./architecture). |
| `PORT` | `8085` in code (`default.ts`); `.env.example` overrides to `8087` to match `make dev-api` | The port the NestJS server listens on. |
| `CLIENT_URL` | `http://stackdoc.localhost:5173` | CORS origin and GitHub OAuth callback base. |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/stackdoc-db` | Matches `make infra`'s bundled Postgres out of the box. |
| `JWT_SECRET` | `stackdoc-dev-secret-change-in-production` | Dev-only fallback — set a real secret for any non-local deployment. |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | empty | Required for GitHub OAuth sign-in to work; unset disables sign-in, not the rest of the app. |
| `GITHUB_CALLBACK_URL` | `http://stackdoc.localhost:8087/auth/github/callback` | Must match one of the OAuth app's explicit registered callback URLs in GitHub — one per environment, wildcard matching off. |

## `apps/web`

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://stackdoc.localhost:8087` | The api lives on its own subdomain (not a path under the web app), so this must be an absolute URL — set per environment (e.g. `https://stackdoc-api.kazuki.uk` in prod). Baked in at build time, like all Vite env vars. |
| `VITE_DOCS_URL` | `http://stackdoc.localhost:3001` | The docs site lives on its own subdomain (not a path under the web app), so this must be an absolute URL — set per environment (e.g. `https://stackdoc-docs.kazuki.uk` in prod). Baked in at build time, like all Vite env vars. |

## Prod schema note

Production (`NODE_ENV=production`) has TypeORM `synchronize` off and no migration scripts —
its schema exists from an earlier one-off bootstrap, not a repeatable mechanism. See
[Architecture](./architecture) and the project's internal notes for the open risk this
carries for a from-scratch prod database.
