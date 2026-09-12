# Contributing to oriweave

Thanks for considering a contribution. This document captures the conventions this project
actually uses, discovered from its own commit history, CI config, and tooling — not an
aspirational style guide.

## Before you start

Open an [issue](https://github.com/oryweave/oriweave/issues) describing the bug or
feature so we can agree on the approach before code is written. See the [README](README.md) for
what the project is, its architecture, and local dev setup (`make install` / `make infra` /
`make dev`).

## Branch model

- `develop` is the GitHub default branch. It deploys continuously to a dev environment.
- `master` is the release branch. It deploys the production instance and is branch-protected:
  no deletion, no force-push, a CI-green pull request is required to land on it.
- Feature branches are named `<type>/<short-description>`, matching the commit type below —
  `feat/add-healthcheck`, `fix/build-time-node-env`, `chore/cleanup-project-config`,
  `docs/update-readme`, `refactor/refactor-project`. This is consistent practice, not enforced
  by tooling.
- Feature branches target `develop`.
- **`develop` → `master`** (advancing a release): always a reviewed pull request. This is the
  release gate.
- **`master` → `develop`** (syncing a release back down): a local `git merge` + `git push` —
  never a pull request. Opening a PR in this direction puts `master` in the PR's head position,
  which risks it being auto-deleted by `delete_branch_on_merge` if branch protection is ever
  off. This is not a hypothetical: it's how `master` was briefly deleted during this project's
  own hardening work.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) —
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, with an optional scope
(`feat(web):`, `fix(ci):`, `chore(packages):`). This is consistent in the project's history but
**is not enforced by a commit-msg hook** — there's no commitlint config, only a pre-commit hook
that runs lint-staged (ESLint + Prettier) on staged files. Conventional prefixes matter beyond
style: [release-please](https://github.com/googleapis/release-please) parses individual commit
messages on `master` to decide the next version and changelog section, so an unconventional
commit message on a commit that lands on `master` will be miscategorized or dropped from the
changelog.

## Pull requests

- Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`) — what the PR does, the task
  description, how to manually test it, and screenshots if relevant.
- Target `develop`, unless you're doing the release-gate `develop` → `master` PR described
  above.
- CI (`.github/workflows/ci.yml`) runs `lint`, `typecheck`, `build`, and `test` on every PR.
  All four are required status checks on `master`.
- Feature branches into `develop` merge via **squash** — one clean commit per feature, using
  the PR title as the commit message, folding away in-branch noise (wip, typo fixes, review
  follow-ups). Use a conventional-commit-formatted PR title, since it becomes the commit that
  release-please will eventually see.
- `develop → master` PRs still merge as a **merge commit** (not squash) — this preserves each
  feature's individual commit on `master`, which is what release-please parses per-commit for
  versioning and changelog sections. Squashing this direction would collapse an entire release
  into one commit and break that per-feature categorization.
- No required human approvals — this is a small-maintainer project and branch protection is
  configured with 0 required reviewers. Admin bypass stays on for emergencies.

## Code style

Enforced by ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc`), run automatically on
staged files via Husky + lint-staged on commit:

- Single quotes, no semicolons, 2-space indent.
- Trailing commas everywhere valid, 100-character print width, `always` arrow-function parens,
  LF line endings.
- Comments explain implementation decisions, not what the code obviously does.

Run `make lint` to check the whole workspace, or let lint-staged catch it at commit time.

## Testing

- `packages/core` — vitest, with real coverage. Add tests when touching the
  parser/validator/layout engine/port logic. Fixtures live in
  `packages/core/__tests__/fixtures.ts`.
- `packages/renderer` — vitest, but only for pure-function helpers. No component-render tests.
- `apps/api` and `apps/web` — no automated test suite. Verify changes manually.
- `make test` requires Node 24 (see `.nvmrc`) — `packages/core`'s suite hits a `node:util`
  `styleText` incompatibility on Node 20.12.

## Architecture boundaries

- `packages/core` is pure TypeScript — parser, validator, layout engine, port
  enumeration/resolution. No React or DOM imports, ever.
- `packages/renderer` is React SVG components. It never parses YAML; it accepts a
  `PositionedGraph` and paints it.
- `apps/web` wires `core` → `renderer`: it calls `parse()`/`layout()` from `core` and passes the
  result to the renderer. Layout math doesn't belong in `apps/web`.

See the [README's Architecture section](README.md#architecture) for the full picture.

## Templates

Starter templates (YAML + sidecar JSON metadata) live at
`apps/api/src/database/seeders/templates/`. Each one is verified against the parser and layout
engine before merge.
