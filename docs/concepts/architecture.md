---
title: Architecture
---

# Architecture

stackdoc is a pnpm monorepo with strict layer boundaries.

```
packages/
├── core/        Pure TypeScript. Parser, validator, layout engine, port enumeration, group nesting. Zero DOM/React. Has tests.
└── renderer/    React components that paint a PositionedGraph. Knows nothing about YAML or layout algorithms.

apps/
├── api/         NestJS + TypeORM + Postgres. Auth, configs, gallery, templates, sharing.
└── web/         Vite + React. The editor, gallery, templates pages, landing page. Wires core + renderer together.
```

The `core` package is the brain. It accepts YAML and produces a `PositionedGraph` — typed
positions for every node, edge, and group. The renderer is the face. It accepts a
`PositionedGraph` and paints it. Neither knows anything about the other's domain.

This separation matters because layout decisions are testable-in-isolation, and the renderer
can be reused (or replaced) without rewriting the schema.
