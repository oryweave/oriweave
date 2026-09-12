---
slug: /
title: StackDoc Docs
---

# StackDoc Docs

Reference documentation for [StackDoc](https://stackdoc.kazuki.uk) — document your homelab
as YAML, render it as a live topology.

For the project pitch, features, and a quickstart, see the
[README](https://github.com/thatkazuk1/infra-stackdoc#readme). This section covers what the
README doesn't: the full local dev setup, the YAML schema, the codebase's layer boundaries,
and runtime configuration.

- **[Installation & Development](./installation)** — clone, install, run, and test the
  monorepo locally.
- **[Schema Reference](./schema-reference)** — every top-level YAML section, with a worked
  example.
- **[Architecture](./architecture)** — the `packages/core` / `packages/renderer` /
  `apps/api` / `apps/web` split and why it's shaped that way.
- **[Configuration](./configuration)** — environment variables the api and web apps read,
  and their defaults.
