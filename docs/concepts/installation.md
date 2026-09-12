---
title: Installation & Development
---

# Installation & Development

## Setting Up

```bash
git clone https://github.com/thatkazuk1/infra-stackdoc.git
cd infra-stackdoc
```

## Development

```bash
make install        # pnpm install across the workspace
make infra          # start Postgres in Docker (one container)
make dev            # start web (5173) and api (8087) in parallel
```

Open [http://stackdoc.localhost:5173](http://stackdoc.localhost:5173) (not plain `localhost` — the api's CORS/OAuth config is
pinned to the `stackdoc.localhost` origin by default; `.localhost` resolves to loopback with no
extra setup).

## Testing

```bash
make test           # vitest — packages/core and packages/renderer
make typecheck       # pnpm -r typecheck
make build            # packages first, then apps
make lint              # workspace-wide ESLint
```

Requires Node 24 — `packages/core`'s vitest suite crashes on a `node:util` `styleText`
incompatibility on Node 20.12. `apps/api` and `apps/web` have no automated test suite; changes
there are verified manually.
