---
title: Schema Reference
---

# Schema Reference

The full schema lives in
[`packages/core/src/types.ts`](https://github.com/oryweave/oriweave/blob/develop/packages/core/src/types.ts).

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

This is one of the seeded templates. Five others (Proxmox cluster, NAS-centric,
Tailscale-distributed, k3s cluster, ISP PoP) ship with the app and are discoverable from the
*Templates* page.

---

## Layout hierarchy

The layout engine builds a top-down tree from your connections. Each connection's `from` device
is placed above its `to` device — `from` is the parent, `to` is the child. Swapping the two
changes which side renders as upstream:

```yaml
connections:
  # router renders above server
  - from: router
    to: server
```

### Star-topology hub detection

When multiple connections target the same device (two or more distinct `from` values pointing
`to` the same node), the engine recognizes that node as a **hub** and automatically places it
at the top of the subtree — above all the devices that connect to it:

```yaml
devices:
  - { id: switch-01, name: Core Switch, type: switch }
  - { id: srv-1,     name: Server 1,    type: server }
  - { id: srv-2,     name: Server 2,    type: server }
  - { id: nas-01,    name: NAS,         type: nas    }

connections:
  - { from: srv-1,  to: switch-01 }
  - { from: srv-2,  to: switch-01 }
  - { from: nas-01, to: switch-01 }
```

Here `switch-01` receives connections from three distinct sources, so the engine treats it as
the hub: it renders at depth 0 with all three devices below it — even though each connection's
`from` field names a server, not the switch. You do not need to flip `from`/`to` manually.

For a simple chain where no device is targeted by more than one source, the `from → to`
convention is preserved as-is.

### `direction` field

The `direction` field (`one-way` or `bidirectional`) controls **port assignment only** — it
determines whether the `to`-side device also claims a port slot for the connection. It has no
effect on the layout hierarchy or depth assignment. A `one-way` connection still creates a
parent → child relationship for layout purposes; it just skips the reverse port claim.

### Pinned ports vs auto-assignment

When a device declares labelled ports in its `interfaces` block, connections that specify
`fromPort` or `toPort` are **pinned** to the named port. Connections without an explicit port
reference are **not** auto-assigned to one of the labelled ports — they attach via the
edge-routing fallback instead, keeping the port strip clean for intentional wiring.

If a device has no `ports` array, connections are auto-assigned to port slots as before.
