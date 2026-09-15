# oriweave

Document your homelab as YAML. Render it as a live topology.

## Table of Contents
- [About the Project](#about-the-project)
- [Project Status](#project-status)
- [Features](#features)
- [Schema Reference](#schema-reference)
- [Architecture](#architecture)
- [Known Limitations](#known-limitations)
- [Getting Started](#getting-started)
  - [Dependencies](#dependencies)
  - [Technology Stack](#technology-stack)
  - [Third-party Services](#third-party-services)
- [Installation & Development](#installation--development)
- [How to Get Help](#how-to-get-help)
- [Contributing](#contributing)
- [Authors](#authors)
  - [Repo Activity](#repo-activity)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## About the Project

![Oriweave Screenshot](.github/assets/homelab-topology-screenshot.png)

oriweave turns a YAML description of your network and devices into an interactive topology diagram. The diagram updates as you edit.
Configs are plain text — version them, fork them, share them with a link.

It's built for the kind of person who'd rather write `pve-1.ip: 10.0.10.11` than drag a router icon across a Lucidchart canvas. The
schema is small. The renderer handles layout. You handle accuracy.

Drawing tools (Lucidchart, draw.io, Excalidraw) put pixels on a canvas. That works for a sketch, but the canvas isn't a description
of your infrastructure — it's a picture. Picture and reality drift the moment you spin up a new VM.

oriweave inverts the relationship. The YAML *is* the description. The diagram is generated from it. Update the YAML when reality changes;
the diagram updates with it. The file lives in version control next to the rest of your homelab config.

This is the same logic that won out for documenting APIs (OpenAPI), infrastructure (Terraform), and CI pipelines (GitHub Actions). It
applies just as well to the topology of your basement rack.

A hosted instance is running at **<https://oriweave.dev>**. Sign in with GitHub to save configs, or use it anonymously to sketch.
No registration, no email, no friction. If you'd rather run it yourself, see [Installation & Development](#installation--development) below.

## Project Status

[![CI](https://github.com/oryweave/oriweave/actions/workflows/ci.yml/badge.svg)](https://github.com/oryweave/oriweave/actions/workflows/ci.yml)
[![Release](https://github.com/oryweave/oriweave/actions/workflows/release-please.yml/badge.svg)](https://github.com/oryweave/oriweave/actions/workflows/release-please.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Actively developed, and running a real hosted instance. `develop` is the default branch and deploys continuously to a dev environment; `master`
is the release-gated branch that deploys the production instance at oriweave.dev. See [Contributing](#contributing) for the branch model.

## Features

- Hierarchical groups with nesting up to three levels deep.
- Labelled ports (`WAN`, `LAN1`, `SFP+ 1`) shown on each device's port strip.
- Parallel-link bundles (LAGs) collapsed to a single trunk in the render.
- Live validation with error paths into the YAML.
- Density toolbar — toggle ETH / WIFI / VPN / STORAGE layers independently.
- Focus mode (`F` key) — dim non-neighbours of a selected node. Second `F` extends to 2-hop.
- Minimap with click-to-recentre and drag-to-pan.
- Public sharing — every saved config gets a URL at `/s/<slug>`.
- Forking — duplicate any public config into your own account.
- PNG export, copy-YAML, download-YAML, all from a single share panel.
- Templates and a gallery of community configs, browsable without signing in.

## Schema Reference

The full schema lives in [`packages/core/src/types.ts`](packages/core/src/types.ts) and is documented in full — every top-level section, plus a
worked example — in the [Schema Reference docs](https://docs.oriweave.dev/schema-reference).

## Architecture

oriweave is a pnpm monorepo with strict layer boundaries.

```
packages/
├── core/        Pure TypeScript. Parser, validator, layout engine, port enumeration, group nesting. Zero DOM/React. Has tests.
└── renderer/    React components that paint a PositionedGraph. Knows nothing about YAML or layout algorithms.
apps/
├── api/         NestJS + TypeORM + Postgres. Auth, configs, gallery, templates, sharing.
└── web/         Vite + React. The editor, gallery, templates pages, landing page. Wires core + renderer together.
```

The `core` package is the brain. It accepts YAML and produces a `PositionedGraph` — typed positions for every node, edge, and group. The renderer
is the face. It accepts a `PositionedGraph` and paints it. Neither knows anything about the other's domain.

This separation matters because layout decisions are testable-in-isolation, and the renderer can be reused (or replaced) without rewriting the schema.

## Known Limitations

This is a working tool that powers a hosted instance, but it's not finished. Some honest gaps:

- **Auth is GitHub-only.** Email/password is on the wishlist; we'll add it if it is requested enough.
- **No live device-status integration.** The diagrams describe your homelab; they don't reflect runtime state. A lightweight agent that pulls reachability
or container health into the rendered LED is planned but not started.
- **No in-editor YAML autocomplete or schema squiggles.** Errors appear in the status bar with paths, but the editor doesn't yet surface them inline.
- **The layout engine isn't perfect.** Large topologies with many cross-cluster connections can produce edge crossings that a hand-drawn layout would avoid.

Track these (and propose more) on the [issues page](https://github.com/oryweave/oriweave/issues).

## Getting Started

### Dependencies

To run oriweave locally:

- **`git`** — to clone the repo.
- **Node.js `24`** (pinned in `.nvmrc`, matches CI and the Docker build; `packages/core`'s test suite hits a `node:util` incompatibility on Node 20.12 and needs 24 to run).
- **pnpm `8.6.1`** (pinned in CI's `setup-repo` action).
- **Docker** — for the bundled Postgres. You can also point at any existing Postgres instance via env vars instead.

### Technology Stack

- **React + Vite** — the editor, gallery, templates, and landing page (`apps/web`).
- **CodeMirror** — the YAML editor.
- **NestJS + TypeORM + Postgres** — auth, configs, gallery, templates, sharing (`apps/api`).
- **pnpm workspaces** — monorepo layout across `packages/` and `apps/`.
- **Vitest** — unit tests for `packages/core` and `packages/renderer`.
- **GitHub Actions** — CI (lint/typecheck/build/test) and release automation
  ([release-please](https://github.com/googleapis/release-please)).
- **Coolify** — builds and hosts the deployed web app directly from git.

### Third-party Services

- **GitHub** — OAuth sign-in for saved configs; canonical forge and CI.
- **Coolify** — hosts the production instance at oriweave.dev, auto-deploying from `master`.
- **Cloudflare** — DNS/edge in front of the public hostname.

## Installation & Development

```bash
git clone https://github.com/oryweave/oriweave.git
cd oriweave
make install        # pnpm install across the workspace
make infra          # start Postgres in Docker (one container)
make dev            # start web (5173) and api (8087) in parallel
```

Open <http://oriweave.localhost:5173> (not plain `localhost` — the api's CORS/OAuth config is pinned to the `oriweave.localhost` origin by default; `.localhost` resolves
to loopback with no extra setup).

Full setup detail, testing commands, and the Node-version gotcha are in the [Installation & Development docs](https://docs.oriweave.dev/installation).

## How to Get Help

Open an [issue](https://github.com/oryweave/oriweave/issues) for bugs, questions, or feature requests. There's no dedicated support channel or SLA — this is a
small project with a single maintainer, checked periodically rather than continuously.

## Contributing

PRs are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch model, commit convention, PR process, and code style.

If you'd like to add a starter template, the YAML files live at `apps/api/src/database/seeders/templates/` with sidecar JSON metadata. Each template is verified against
the parser and layout engine before merge.

**[Back to top](#table-of-contents)**

## Authors

**Desmond Edem** ([@thatkazuk1](https://github.com/thatkazuk1)) — sole maintainer and author.

### Repo Activity

TBA.

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgements

The project was inspired by the topology diagrams shared on [r/homelab](https://www.reddit.com/r/homelab/) and [r/selfhosted](https://www.reddit.com/r/selfhosted/), where
one well-formatted hand-drawn diagram routinely outdraws ten Helm charts.
