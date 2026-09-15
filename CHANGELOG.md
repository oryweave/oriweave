# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0](https://github.com/oryweave/oriweave/compare/v0.7.0...v1.0.0) (2026-09-15)


### Features

* add cached GitHub stats endpoint with nav badge ([75d6ed9](https://github.com/oryweave/oriweave/commit/75d6ed9a9ccefc46ee260af79317c2fe37526cda))
* add editor keyboard shortcuts ([#99](https://github.com/oryweave/oriweave/issues/99)) ([8213744](https://github.com/oryweave/oriweave/commit/8213744486a15d90e030762e1079cfd5962a1413))
* add indent-rainbow style depth coloring to the YAML editor ([#102](https://github.com/oryweave/oriweave/issues/102)) ([378233c](https://github.com/oryweave/oriweave/commit/378233c2a2d724438f931943e98a56812f0ba1a0))
* add inline squiggly-underline error markers to the YAML editor ([#101](https://github.com/oryweave/oriweave/issues/101)) ([d02857b](https://github.com/oryweave/oriweave/commit/d02857b7969503a4dd2cd2394605c2aa2e288110))
* add real favicon from oriweave design system ([#92](https://github.com/oryweave/oriweave/issues/92)) ([5542784](https://github.com/oryweave/oriweave/commit/55427847421efafe0258ebecdadf8f04a23b7076))
* add schema-aware autocompletion to the YAML editor ([#103](https://github.com/oryweave/oriweave/issues/103)) ([2485107](https://github.com/oryweave/oriweave/commit/24851072c689a6856fab3cbdc31b05f0654418df))
* bring the app in line with the oriweave UI kit design ([#96](https://github.com/oryweave/oriweave/issues/96)) ([62f5c82](https://github.com/oryweave/oriweave/commit/62f5c825e4228d337aeed8fc526486a720e6d47a))
* integrate the real Logomark, environment ribbon, and landing page CTA cleanup ([#95](https://github.com/oryweave/oriweave/issues/95)) ([ec3c87a](https://github.com/oryweave/oriweave/commit/ec3c87ab1d39449319396631fe2bf1c0e86a351a))
* move ticket to In Progress on PR open, link PR on transition ([#88](https://github.com/oryweave/oriweave/issues/88)) ([2373eb3](https://github.com/oryweave/oriweave/commit/2373eb34903d14fbb41cf078c84ace6bcb5f5283))
* paginate GET /configs/user/me and drop yaml/id/forkOf from its list DTO ([#97](https://github.com/oryweave/oriweave/issues/97)) ([acaf96b](https://github.com/oryweave/oriweave/commit/acaf96b509cc5c170c9f71e30f962bb7caeaff29))


### Bug Fixes

* align color and typography tokens to real oriweave brand system ([#93](https://github.com/oryweave/oriweave/issues/93)) ([da8f82d](https://github.com/oryweave/oriweave/commit/da8f82d2c75e38e3e39ca6e0596c2190adc902d2))
* normalize transition durations to the oriweave motion tokens ([cb2e6e1](https://github.com/oryweave/oriweave/commit/cb2e6e1af87d3b3779132ef16aa9fba268e88895))
* pre-v1.0 stability and UX fixes across configs and sharing ([#98](https://github.com/oryweave/oriweave/issues/98)) ([9ac486f](https://github.com/oryweave/oriweave/commit/9ac486f6a5286d5c63649b5ca8fdd4c7c5789490))
* reference plane-transition by git tag, not image digest ([#84](https://github.com/oryweave/oriweave/issues/84)) ([680f505](https://github.com/oryweave/oriweave/commit/680f5057ea0830ce23f292599494c98aa313d07a))
* refuse to silently sign JWTs with the public default secret ([#104](https://github.com/oryweave/oriweave/issues/104)) ([a7aae58](https://github.com/oryweave/oriweave/commit/a7aae58e9c8c17c1f1e59a5d4ac67e36bdfa20b6))
* stop persisting a config when a template is merely previewed ([#100](https://github.com/oryweave/oriweave/issues/100)) ([cdb3df2](https://github.com/oryweave/oriweave/commit/cdb3df2450911b891d838e6c08cf9f157dce3e21))
* track plane-transition's floating v1 tag ([#86](https://github.com/oryweave/oriweave/issues/86)) ([90e14a0](https://github.com/oryweave/oriweave/commit/90e14a0648fdea5f51d9474995832a78bad6b1f8))


### Documentation

* note live verification of plane-sync workflow ([#83](https://github.com/oryweave/oriweave/issues/83)) ([50c8a9a](https://github.com/oryweave/oriweave/commit/50c8a9af30e6072bbc57321168a6efed66e79d53))
* note live verification of plane-sync workflow (v1.0.1) ([#85](https://github.com/oryweave/oriweave/issues/85)) ([e612c2f](https://github.com/oryweave/oriweave/commit/e612c2f7bb7beae1df587cfe1de7b97c441a1b76))
* note live verification of plane-sync workflow (v1.0.3) ([#87](https://github.com/oryweave/oriweave/issues/87)) ([e48e3f0](https://github.com/oryweave/oriweave/commit/e48e3f0547dd45740af1a284ac793b9db517ead6))
* note live verification of start-on-open and PR-linking ([#89](https://github.com/oryweave/oriweave/issues/89)) ([99b325e](https://github.com/oryweave/oriweave/commit/99b325ecc77f1bd85737f04e35b7d8895a94b680))
* reorganize docs/docs into docs/concepts ([#90](https://github.com/oryweave/oriweave/issues/90)) ([2c91746](https://github.com/oryweave/oriweave/commit/2c917467c1238afa84d5ba5c40e5ea5cc3969d39))

## [0.7.0](https://github.com/thatkazuk1/infra-stackdoc/compare/v0.6.0...v0.7.0) (2026-08-18)


### Features

* drop api global prefix for subdomain migration ([3576825](https://github.com/thatkazuk1/infra-stackdoc/commit/35768251c43cb5a1cf192d246a4833217d2f99a3))
* stand up Docusaurus docs site at stackdoc-docs.kazuki.uk ([#77](https://github.com/thatkazuk1/infra-stackdoc/issues/77)) ([4f6a163](https://github.com/thatkazuk1/infra-stackdoc/commit/4f6a163fa423be5550ad04f2bcaa6ad1bcfc2f09))


### Bug Fixes

* close AppNav gaps and anonymous template-use redirect ([#76](https://github.com/thatkazuk1/infra-stackdoc/issues/76)) ([ab662e0](https://github.com/thatkazuk1/infra-stackdoc/commit/ab662e0035e94efe4dcab7f65862c3ef1a8246d7))


### Documentation

* add CONTRIBUTING.md, remap README, fix stale repo metadata ([24c9dc2](https://github.com/thatkazuk1/infra-stackdoc/commit/24c9dc2d6d6852de312ade5580fe6ab90084180a))
* add CONTRIBUTING.md, remap README, fix stale repo metadata ([3186e82](https://github.com/thatkazuk1/infra-stackdoc/commit/3186e8296c96bb7cf58a1acf6f65edaa0ce744d4))
* squash feature branches into develop, keep merge commit for develop-&gt;master ([#74](https://github.com/thatkazuk1/infra-stackdoc/issues/74)) ([df34bc2](https://github.com/thatkazuk1/infra-stackdoc/commit/df34bc2dd0479ba87458f26e01569534630534df))

## [0.6.0](https://github.com/thatkazuk1/infra-stackdoc/compare/v0.5.0...v0.6.0) (2026-08-05)


### Features

* **web:** env-aware page title, drop HSTS on the web container ([#67](https://github.com/thatkazuk1/infra-stackdoc/issues/67)) ([54a9c8b](https://github.com/thatkazuk1/infra-stackdoc/commit/54a9c8b62f2ceeed3eb864dd90e6b748831d99f5))


### Bug Fixes

* force NODE_ENV=development for docker build stages ([6dda1bb](https://github.com/thatkazuk1/infra-stackdoc/commit/6dda1bbf718f5a860be002f0b4856687fc5f0575))
* force NODE_ENV=development for docker build stages ([0199161](https://github.com/thatkazuk1/infra-stackdoc/commit/0199161b0921f7130e3556370120676955f5b3d1))
* unblock api Coolify deploy — env defaults and healthcheck path ([#66](https://github.com/thatkazuk1/infra-stackdoc/issues/66)) ([d250043](https://github.com/thatkazuk1/infra-stackdoc/commit/d2500436af0b52be0c35f3d7a706698dfc78c063))

## [0.5.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.4.0...v0.5.0) (2026-05-18)


### Features

* add app navigation ([#59](https://github.com/meetKazuki/infra-stackdoc/issues/59)) ([0403284](https://github.com/meetKazuki/infra-stackdoc/commit/0403284aa30c1c558412685df354d7cd055198e2))
* Add Landing Page ([#57](https://github.com/meetKazuki/infra-stackdoc/issues/57)) ([79b7e6a](https://github.com/meetKazuki/infra-stackdoc/commit/79b7e6a212031c78105ea67ecef8eda184d81a40))
* polish community gallery ([#56](https://github.com/meetKazuki/infra-stackdoc/issues/56)) ([5e80df3](https://github.com/meetKazuki/infra-stackdoc/commit/5e80df344581693dc32c1fd812b63d908cb61d7c))
* polish my configs ([#55](https://github.com/meetKazuki/infra-stackdoc/issues/55)) ([282dfeb](https://github.com/meetKazuki/infra-stackdoc/commit/282dfeb4776d1912dc24172004c661b509998365))
* sync `master` with latest changes ([b012923](https://github.com/meetKazuki/infra-stackdoc/commit/b012923dbc6971e4e40d342d572fb10a4225dfa0))
* Sync `master` with Latest Changes ([b012923](https://github.com/meetKazuki/infra-stackdoc/commit/b012923dbc6971e4e40d342d572fb10a4225dfa0))


### Bug Fixes

* fix preview bug ([#58](https://github.com/meetKazuki/infra-stackdoc/issues/58)) ([98bef94](https://github.com/meetKazuki/infra-stackdoc/commit/98bef944b11c9761d1f636da38c0fe67a823c26e))


### Documentation

* update README.md ([#61](https://github.com/meetKazuki/infra-stackdoc/issues/61)) ([2a36070](https://github.com/meetKazuki/infra-stackdoc/commit/2a360700f2f34af461e58ddaea356219bf737d10))

## [0.4.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.3.0...v0.4.0) (2026-05-16)


### Features

* improve visuals across editor, configs, gallery & template ([#52](https://github.com/meetKazuki/infra-stackdoc/issues/52)) ([3493da9](https://github.com/meetKazuki/infra-stackdoc/commit/3493da9b1ccc8ddf629d2fe52df398d098025de1))

## [0.3.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.2.0...v0.3.0) (2026-05-15)


### Features

* release accumulated features from develop ([78aca1f](https://github.com/meetKazuki/infra-stackdoc/commit/78aca1f8f870e9261e384cf56a192333e24e4fe0))

## [0.2.0](https://github.com/meetKazuki/infra-stackdoc/compare/v0.1.0...v0.2.0) (2026-03-27)


### Features

* enhance visual layout ([#21](https://github.com/meetKazuki/infra-stackdoc/issues/21)) ([1b2418e](https://github.com/meetKazuki/infra-stackdoc/commit/1b2418ea6a5123be405f0ade1c49cc74678b538b))
* Merge New Changes ([#26](https://github.com/meetKazuki/infra-stackdoc/issues/26)) ([e9f2c33](https://github.com/meetKazuki/infra-stackdoc/commit/e9f2c331ab2fed2600f5b7e60b607bf28d575c02))

## [0.1.0] — 2025-03-20

### Added

- YAML schema with `meta`, `networks`, `groups`, `devices`, `connections` sections
- Parser and validator in `packages/core` (pure TypeScript, zero DOM dependencies)
- Hierarchical layout engine with BFS depth assignment, fan-out edge routing, and group-aware positioning
- Expand/collapse: click a device to reveal its children (VMs, containers) and services
- Connection re-routing: edges to collapsed children terminate at the parent
- `services` field on devices with `name`, `port`, and `runtime` (native/docker/podman)
- React renderer in `packages/renderer` with device cards, animated connection lines, group outlines
- Device type icons and colour-coded accent bars (router, switch, server, hypervisor, VM, container, camera, IoT, etc.)
- Animated directional flow on connection lines (marching dots)
- CodeMirror 6 YAML editor with syntax highlighting, line numbers, code folding, undo/redo, search
- Canvas controls: zoom in/out, fit-to-screen, reset, percentage indicator
- Share panel: export as PNG (2x resolution), copy YAML to clipboard, download YAML file
- Split-pane UI with draggable resizer
- Auto-fit graph to viewport on load
- Docker production build (multi-stage: node:20-alpine → nginx:alpine)
- Makefile with all admin commands
