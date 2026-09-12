---
title: Schema Reference
---

# Schema Reference

The full schema lives in
[`packages/core/src/types.ts`](https://github.com/thatkazuk1/infra-stackdoc/blob/develop/packages/core/src/types.ts).

Top-level sections:

- **`meta`** — title, subtitle, tags, last-updated timestamp.
- **`networks`** — named L2/L3 segments with subnets and optional VLANs.
- **`groups`** — visual clusters. Can be nested (`parent: <group-id>`).
- **`devices`** — the things on your network. Each device has a `type` (router, server,
  hypervisor, container, nas, laptop, etc.), an `ip`, a `network`, optional `group`, and
  optional `interfaces`, `services`, `specs`, `tags`, `children`.
- **`connections`** — edges between devices. Can reference labelled ports (`fromPort: WAN`), be
  bundled into LAGs (`bundle: nas-lag`), and carry a type (`ethernet`, `wifi`, `vpn`, `fiber`,
  `usb`, `thunderbolt`).

Validation runs on every edit. Errors and warnings appear in the editor's status bar with paths
into the YAML (e.g. `devices[3].interfaces.ethernet.count`).

The smallest useful config:

```yaml
meta:
  title: Single-Host Docker
  tags: [DOCKER, BEGINNER]

networks:
  - id: lan
    name: Home LAN
    subnet: 192.168.1.0/24

groups:
  - id: edge
    name: Network Edge
    color: "#00e5ff"

devices:
  - id: router
    name: Home Router
    type: router
    ip: 192.168.1.1
    network: lan
    group: edge
    interfaces:
      ethernet:
        count: 5
        speed: 1G
        ports:
          - { label: WAN }
          - { label: LAN1 }
          - { label: LAN2 }
          - { label: LAN3 }
          - { label: LAN4 }

  - id: docker-host
    name: docker-host
    type: server
    ip: 192.168.1.10
    network: lan
    services:
      - name: Jellyfin
        port: 8096
        runtime: docker

connections:
  - from: router
    to: docker-host
    fromPort: LAN1
    type: ethernet
    speed: 2.5G
```

This is one of the seeded templates. Four others (Proxmox cluster, NAS-centric,
Tailscale-distributed, k3s cluster) ship with the app and are discoverable from the *Templates*
page.
