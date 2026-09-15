import { describe, it, expect } from 'vitest'
import {
  buildDoc,
  buildDevice,
  buildConnection,
  buildDocWithChildren,
  buildDocWithNestedGroups,
} from './fixtures'
import { DEFAULT_LAYOUT_OPTIONS } from '../src/types'
import { layout } from '../src/layout'
import type { HomelabDocument, PositionedGraph } from '../src/types'

// ─── Helpers ──────────────────────────────────────────────────────

/** Shortcut to find a positioned node by device id. */
function findNode(graph: PositionedGraph, id: string) {
  return graph.nodes.find((n) => n.device.id === id)
}

/** Shortcut to find an edge by its from→to pair. */
function findEdge(graph: PositionedGraph, from: string, to: string) {
  return graph.edges.find((e) => e.fromNodeId === from && e.toNodeId === to)
}

/** Whether two positioned rectangles (nodes or groups) overlap in 2D. */
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/** Whether `outer` fully encloses `inner`. */
function contains(
  outer: { x: number; y: number; width: number; height: number },
  inner: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  )
}

// ─── Basic positioning ────────────────────────────────────────────

describe('layout › basic positioning', () => {
  it('places a single device as one node with default dimensions', () => {
    const doc = buildDoc()

    const graph = layout(doc)

    expect(graph.nodes).toHaveLength(1)
    const node = graph.nodes[0]
    expect(node.device.id).toBe('router')
    expect(node.width).toBe(DEFAULT_LAYOUT_OPTIONS.nodeWidth)
    expect(node.height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
    expect(node.depth).toBe(0)
  })

  it('positions multiple unconnected devices in the same layer (depth 0)', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'a', name: 'A' }),
        buildDevice({ id: 'b', name: 'B' }),
        buildDevice({ id: 'c', name: 'C' }),
      ],
    })

    const graph = layout(doc)

    expect(graph.nodes).toHaveLength(3)

    // All nodes should share the same y and depth since there are no connections.
    const ys = graph.nodes.map((n) => n.y)
    expect(new Set(ys).size).toBe(1)

    const depths = graph.nodes.map((n) => n.depth)
    expect(depths).toEqual([0, 0, 0])

    // Nodes should be sorted left-to-right with increasing x.
    const xs = graph.nodes.map((n) => n.x)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  it('layers connected devices at increasing depth', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'a', name: 'Root' }),
        buildDevice({ id: 'b', name: 'Mid' }),
        buildDevice({ id: 'c', name: 'Leaf' }),
      ],
      connections: [
        buildConnection({ from: 'a', to: 'b' }),
        buildConnection({ from: 'b', to: 'c' }),
      ],
    })

    const graph = layout(doc)

    const a = findNode(graph, 'a')!
    const b = findNode(graph, 'b')!
    const c = findNode(graph, 'c')!

    expect(a.depth).toBe(0)
    expect(b.depth).toBe(1)
    expect(c.depth).toBe(2)

    // Deeper nodes must have a higher y coordinate (further down).
    expect(a.y).toBeLessThan(b.y)
    expect(b.y).toBeLessThan(c.y)
  })

  it('normalises all positions to positive coordinates', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
    })

    const graph = layout(doc)

    for (const node of graph.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives all nodes uniform dimensions regardless of content', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'bare', name: 'Bare' }),
        {
          id: 'loaded',
          name: 'Loaded Server',
          type: 'hypervisor',
          children: [
            { id: 'vm-1', name: 'VM 1', type: 'vm' },
            { id: 'vm-2', name: 'VM 2', type: 'vm' },
          ],
          services: [
            { name: 'nginx', port: 80 },
            { name: 'postgres', port: 5432 },
          ],
        },
      ],
    })

    const graph = layout(doc)

    const widths = new Set(graph.nodes.map((n) => n.width))
    const heights = new Set(graph.nodes.map((n) => n.height))

    expect(widths.size).toBe(1)
    expect(heights.size).toBe(1)
    expect(graph.nodes[0].width).toBe(DEFAULT_LAYOUT_OPTIONS.nodeWidth)
    expect(graph.nodes[0].height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
  })
})

// ─── Card height (port-row overflow) ───────────────────────────────

describe('layout › card height', () => {
  it('keeps the default height for a device with few ports', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'router', interfaces: { ethernet: { count: 4 } } })],
    })

    const graph = layout(doc)

    expect(findNode(graph, 'router')!.height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
  })

  it('grows a card taller when its ethernet ports need a second row', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'switch', interfaces: { ethernet: { count: 24 } } })],
    })

    const graph = layout(doc)

    expect(findNode(graph, 'switch')!.height).toBeGreaterThan(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
  })

  it('positions the next layer clear of a taller card in the layer above', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'switch', interfaces: { ethernet: { count: 24 } } }),
        buildDevice({ id: 'leaf' }),
      ],
      connections: [buildConnection({ from: 'switch', to: 'leaf' })],
    })

    const graph = layout(doc)

    const switchNode = findNode(graph, 'switch')!
    const leafNode = findNode(graph, 'leaf')!

    expect(leafNode.y).toBeGreaterThanOrEqual(switchNode.y + switchNode.height)
  })

  it('grows a card even taller when SFP has to drop to its own row beside a wide ethernet block', () => {
    const ethOnly = buildDoc({
      devices: [buildDevice({ id: 'switch', interfaces: { ethernet: { count: 24 } } })],
    })
    const ethPlusSfp = buildDoc({
      devices: [
        buildDevice({
          id: 'switch',
          interfaces: { ethernet: { count: 24 }, sfp: { count: 4 } },
        }),
      ],
    })

    const ethOnlyHeight = findNode(layout(ethOnly), 'switch')!.height
    const ethPlusSfpHeight = findNode(layout(ethPlusSfp), 'switch')!.height

    expect(ethPlusSfpHeight).toBeGreaterThan(ethOnlyHeight)
  })
})

// ─── Connection rerouting ─────────────────────────────────────────
// Children are rendered inside parent cards, not as separate graph
// nodes. Any connection referencing a child is rerouted to its parent.

describe('layout › connection rerouting', () => {
  it('only positions top-level devices as graph nodes, not children', () => {
    const doc = buildDocWithChildren()
    const graph = layout(doc)

    const ids = graph.nodes.map((n) => n.device.id)
    expect(ids).toContain('hypervisor')
    expect(ids).toContain('switch')
    expect(ids).not.toContain('vm-1')
    expect(ids).not.toContain('vm-2')
  })

  it('reroutes connections targeting child devices to the parent', () => {
    const doc: HomelabDocument = {
      meta: { title: 'Reroute test' },
      devices: [
        {
          id: 'parent',
          name: 'Parent',
          type: 'hypervisor',
          children: [{ id: 'child', name: 'Child', type: 'vm' }],
        },
        buildDevice({ id: 'ext', name: 'External', type: 'switch' }),
      ],
      connections: [
        buildConnection({ from: 'child', to: 'ext' }),
        buildConnection({ from: 'parent', to: 'ext' }),
      ],
    }

    const graph = layout(doc)

    // After rerouting and dedup, only one edge parent→ext should survive.
    const edgePairs = graph.edges.map((e) => `${e.fromNodeId}→${e.toNodeId}`)
    expect(edgePairs).toContain('parent→ext')
    expect(edgePairs).not.toContain('child→ext')

    // Deduplication: shouldn't have two parent→ext edges.
    const parentToExt = graph.edges.filter((e) => e.fromNodeId === 'parent' && e.toNodeId === 'ext')
    expect(parentToExt).toHaveLength(1)
  })

  it('eliminates self-connections created by rerouting', () => {
    const doc: HomelabDocument = {
      meta: { title: 'Self-loop test' },
      devices: [
        {
          id: 'host',
          name: 'Host',
          type: 'hypervisor',
          children: [{ id: 'vm', name: 'VM', type: 'vm' }],
        },
      ],
      // vm → host reroutes to host → host → eliminated.
      connections: [buildConnection({ from: 'vm', to: 'host' })],
    }

    const graph = layout(doc)

    const selfEdges = graph.edges.filter((e) => e.fromNodeId === e.toNodeId)
    expect(selfEdges).toHaveLength(0)
  })

  it('deduplicates rerouted connections that produce the same pair', () => {
    const doc: HomelabDocument = {
      meta: { title: 'Dedup test' },
      devices: [
        {
          id: 'host',
          name: 'Host',
          type: 'hypervisor',
          children: [
            { id: 'vm-a', name: 'VM A', type: 'vm' },
            { id: 'vm-b', name: 'VM B', type: 'vm' },
          ],
        },
        buildDevice({ id: 'sw', name: 'Switch', type: 'switch' }),
      ],
      // Both child connections reroute to host→sw.
      connections: [
        buildConnection({ from: 'vm-a', to: 'sw' }),
        buildConnection({ from: 'vm-b', to: 'sw' }),
        buildConnection({ from: 'host', to: 'sw' }),
      ],
    }

    const graph = layout(doc)

    const hostToSw = graph.edges.filter((e) => e.fromNodeId === 'host' && e.toNodeId === 'sw')
    expect(hostToSw).toHaveLength(1)
  })

  it('preserves genuine parallel links between the same top-level pair (no rerouting)', () => {
    const doc: HomelabDocument = {
      meta: { title: 'Parallel links test' },
      devices: [
        buildDevice({
          id: 'sw1',
          name: 'Switch 1',
          type: 'switch',
          interfaces: { ethernet: { count: 4 } },
        }),
        buildDevice({
          id: 'sw2',
          name: 'Switch 2',
          type: 'switch',
          interfaces: { ethernet: { count: 4 } },
        }),
      ],
      connections: [
        buildConnection({ from: 'sw1', to: 'sw2' }),
        buildConnection({ from: 'sw1', to: 'sw2' }),
      ],
    }

    const graph = layout(doc)

    const links = graph.edges.filter((e) => e.fromNodeId === 'sw1' && e.toNodeId === 'sw2')
    expect(links).toHaveLength(2)

    // Each link should get its own port, so they shouldn't render on
    // identical coordinates.
    expect(links[0].points).not.toEqual(links[1].points)
    expect(links[0].fromPortIndex).not.toBe(links[1].fromPortIndex)
    expect(links[0].toPortIndex).not.toBe(links[1].toPortIndex)
  })
})

// ─── Groups ───────────────────────────────────────────────────────

describe('layout › groups', () => {
  it('computes a bounding box around member devices', () => {
    const doc = buildDoc({
      groups: [{ id: 'rack', name: 'Server Rack' }],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'rack' }),
        buildDevice({ id: 'b', name: 'B', group: 'rack' }),
      ],
    })

    const graph = layout(doc)

    expect(graph.groups).toHaveLength(1)
    const group = graph.groups[0]

    const a = findNode(graph, 'a')!
    const b = findNode(graph, 'b')!

    const pad = DEFAULT_LAYOUT_OPTIONS.groupPadding

    // Group box should contain both nodes with padding.
    expect(group.x).toBeLessThanOrEqual(a.x - pad)
    expect(group.y).toBeLessThanOrEqual(a.y - pad)
    expect(group.x + group.width).toBeGreaterThanOrEqual(b.x + b.width + pad)
    expect(group.y + group.height).toBeGreaterThanOrEqual(b.y + b.height + pad)
  })

  it('filters out groups with no member devices', () => {
    const doc = buildDoc({
      groups: [
        { id: 'populated', name: 'Has members' },
        { id: 'empty', name: 'No members' },
      ],
      devices: [buildDevice({ id: 'srv', name: 'Server', group: 'populated' })],
    })

    const graph = layout(doc)

    expect(graph.groups).toHaveLength(1)
    expect(graph.groups[0].group.id).toBe('populated')
  })

  it('applies group padding correctly', () => {
    const customPadding = 20
    const doc = buildDoc({
      groups: [{ id: 'g', name: 'G' }],
      devices: [buildDevice({ id: 'only', name: 'Only', group: 'g' })],
    })

    const graph = layout(doc, { groupPadding: customPadding })

    const node = findNode(graph, 'only')!
    const group = graph.groups[0]

    // For a single-node group:
    //   width  = nodeWidth + 2 * padding  (symmetric left/right)
    //   height = nodeHeight + padding + (padding + 16)  (extra 16 at top for label)
    expect(group.width).toBe(node.width + customPadding * 2)
    expect(group.height).toBe(node.height + customPadding * 2 + 16)
  })

  it('adds extra horizontal spacing between nodes in different groups', () => {
    // Two nodes in DIFFERENT groups — should get extra spacing.
    const diffGroupDoc = buildDoc({
      groups: [
        { id: 'left-group', name: 'Left' },
        { id: 'right-group', name: 'Right' },
      ],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'left-group' }),
        buildDevice({ id: 'b', name: 'B', group: 'right-group' }),
      ],
    })
    const diffLayout = layout(diffGroupDoc)

    // Two nodes in the SAME group — baseline spacing.
    const sameGroupDoc = buildDoc({
      groups: [{ id: 'shared', name: 'Shared' }],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'shared' }),
        buildDevice({ id: 'b', name: 'B', group: 'shared' }),
      ],
    })
    const sameLayout = layout(sameGroupDoc)

    const diffGap =
      findNode(diffLayout, 'b')!.x -
      (findNode(diffLayout, 'a')!.x + findNode(diffLayout, 'a')!.width)
    const sameGap =
      findNode(sameLayout, 'b')!.x -
      (findNode(sameLayout, 'a')!.x + findNode(sameLayout, 'a')!.width)

    // Nodes in different groups should be spaced further apart than
    // nodes sharing a group.
    expect(diffGap).toBeGreaterThan(sameGap)
  })

  it('adds extra vertical spacing between layers when top-level groups differ, so group boxes never overlap', () => {
    const buildTwoLayerDoc = (grouped: boolean) =>
      buildDoc({
        groups: grouped
          ? [
              { id: 'top-group', name: 'Top' },
              { id: 'bottom-group', name: 'Bottom' },
            ]
          : undefined,
        devices: [
          buildDevice({ id: 'top', name: 'Top', ...(grouped ? { group: 'top-group' } : {}) }),
          buildDevice({
            id: 'bottom',
            name: 'Bottom',
            ...(grouped ? { group: 'bottom-group' } : {}),
          }),
        ],
        connections: [buildConnection({ from: 'top', to: 'bottom' })],
      })

    const groupedGraph = layout(buildTwoLayerDoc(true))
    const ungroupedGraph = layout(buildTwoLayerDoc(false))

    const groupedGap =
      findNode(groupedGraph, 'bottom')!.y -
      (findNode(groupedGraph, 'top')!.y + findNode(groupedGraph, 'top')!.height)
    const ungroupedGap =
      findNode(ungroupedGraph, 'bottom')!.y -
      (findNode(ungroupedGraph, 'top')!.y + findNode(ungroupedGraph, 'top')!.height)

    expect(groupedGap).toBeGreaterThan(ungroupedGap)

    // The two group boxes themselves must not overlap vertically — this is
    // the actual bug: box padding used to extend past the flat layer gap.
    const topBox = groupedGraph.groups.find((g) => g.group.id === 'top-group')!
    const bottomBox = groupedGraph.groups.find((g) => g.group.id === 'bottom-group')!
    expect(topBox.y + topBox.height).toBeLessThanOrEqual(bottomBox.y)
  })

  it('does not add extra vertical spacing across layers that share a top-level group', () => {
    // control-plane and workers are both children of k3s-cluster, at
    // different depths — they must NOT get the cross-group gap between
    // them, only the true group boundary (edge → k3s-cluster) should.
    const doc = buildDoc({
      groups: [
        { id: 'edge', name: 'Edge' },
        { id: 'k3s-cluster', name: 'k3s' },
        { id: 'control-plane', name: 'Control Plane', parent: 'k3s-cluster' },
        { id: 'workers', name: 'Workers', parent: 'k3s-cluster' },
      ],
      devices: [
        buildDevice({ id: 'switch', name: 'Switch', group: 'edge' }),
        buildDevice({ id: 'master', name: 'Master', group: 'control-plane' }),
        buildDevice({ id: 'worker', name: 'Worker', group: 'workers' }),
      ],
      connections: [
        buildConnection({ from: 'switch', to: 'master' }),
        buildConnection({ from: 'master', to: 'worker' }),
      ],
    })

    const graph = layout(doc)

    const switchToMasterGap =
      findNode(graph, 'master')!.y -
      (findNode(graph, 'switch')!.y + findNode(graph, 'switch')!.height)
    const masterToWorkerGap =
      findNode(graph, 'worker')!.y -
      (findNode(graph, 'master')!.y + findNode(graph, 'master')!.height)

    // switch (edge) → master (k3s-cluster) crosses a real group boundary;
    // master → worker stays within k3s-cluster the whole way.
    expect(switchToMasterGap).toBeGreaterThan(masterToWorkerGap)
  })

  it('never overlaps a leaf group box with a NESTED group box in the layer after it', () => {
    // A flat group followed by a group with nested children needs more
    // clearance than a flat-vs-flat boundary: the nested group's own
    // extra padding (see positionGroups' extraPad) stacks on top of the
    // plain cross-group gap, so a fixed guess isn't enough — this must
    // hold regardless of how deep the nesting goes.
    const doc = buildDoc({
      groups: [
        { id: 'edge', name: 'Edge' },
        { id: 'k3s-cluster', name: 'k3s' },
        { id: 'control-plane', name: 'Control Plane', parent: 'k3s-cluster' },
        { id: 'workers', name: 'Workers', parent: 'k3s-cluster' },
        { id: 'storage-tier', name: 'Storage' },
      ],
      devices: [
        buildDevice({ id: 'router', name: 'Router', group: 'edge' }),
        buildDevice({ id: 'switch', name: 'Switch', group: 'edge' }),
        buildDevice({ id: 'master', name: 'Master', group: 'control-plane' }),
        buildDevice({ id: 'worker-1', name: 'Worker 1', group: 'workers' }),
        buildDevice({ id: 'worker-2', name: 'Worker 2', group: 'workers' }),
        buildDevice({ id: 'nfs', name: 'NFS', group: 'storage-tier' }),
      ],
      connections: [
        buildConnection({ from: 'router', to: 'switch' }),
        buildConnection({ from: 'switch', to: 'master' }),
        buildConnection({ from: 'switch', to: 'worker-1' }),
        buildConnection({ from: 'switch', to: 'worker-2' }),
        buildConnection({ from: 'switch', to: 'nfs' }),
      ],
    })

    const graph = layout(doc)

    const byId = new Map(graph.groups.map((g) => [g.group.id, g]))
    const edge = byId.get('edge')!
    const k3sCluster = byId.get('k3s-cluster')!
    const storageTier = byId.get('storage-tier')!

    expect(overlaps(edge, k3sCluster)).toBe(false)
    expect(overlaps(edge, storageTier)).toBe(false)
    expect(overlaps(k3sCluster, storageTier)).toBe(false)
  })

  it('keeps every group box fully inside its own parent after overlap resolution', () => {
    // Overlap resolution must never patch a box's coordinates directly —
    // only shift the underlying nodes and recompute — otherwise a parent
    // can end up not enclosing children it just got separated from a
    // sibling around (the actual regression: fixing edge-vs-k3s-cluster
    // by nudging boxes directly left control-plane/workers stranded
    // outside their own, unmoved, k3s-cluster wrapper).
    const doc = buildDoc({
      groups: [
        { id: 'edge', name: 'Edge' },
        { id: 'k3s-cluster', name: 'k3s' },
        { id: 'control-plane', name: 'Control Plane', parent: 'k3s-cluster' },
        { id: 'workers', name: 'Workers', parent: 'k3s-cluster' },
        { id: 'storage-tier', name: 'Storage' },
      ],
      devices: [
        buildDevice({ id: 'router', name: 'Router', group: 'edge' }),
        buildDevice({ id: 'switch', name: 'Switch', group: 'edge' }),
        buildDevice({ id: 'master', name: 'Master', group: 'control-plane' }),
        buildDevice({ id: 'worker-1', name: 'Worker 1', group: 'workers' }),
        buildDevice({ id: 'worker-2', name: 'Worker 2', group: 'workers' }),
        buildDevice({ id: 'nfs', name: 'NFS', group: 'storage-tier' }),
      ],
      connections: [
        buildConnection({ from: 'router', to: 'switch' }),
        buildConnection({ from: 'switch', to: 'master' }),
        buildConnection({ from: 'switch', to: 'worker-1' }),
        buildConnection({ from: 'switch', to: 'worker-2' }),
        buildConnection({ from: 'switch', to: 'nfs' }),
      ],
    })

    const graph = layout(doc)
    const byId = new Map(graph.groups.map((g) => [g.group.id, g]))

    expect(contains(byId.get('k3s-cluster')!, byId.get('control-plane')!)).toBe(true)
    expect(contains(byId.get('k3s-cluster')!, byId.get('workers')!)).toBe(true)
  })

  it('correctly separates a group spanning multiple depths from a single-depth sibling it shares a row with', () => {
    // `infra` wraps `edge` (depths 0-1) AND `storage-zone` (depth 2) — its
    // depth RANGE is [0,2]. `clients` sits only at depth 2. Comparing only
    // each group's shallowest depth (0 vs 2) would misjudge this as
    // "different rows" and trigger a pointless, ever-growing vertical
    // shift instead of the horizontal one actually needed at the shared
    // depth-2 row.
    const doc = buildDoc({
      groups: [
        { id: 'infra', name: 'Infrastructure' },
        { id: 'edge', name: 'Edge', parent: 'infra' },
        { id: 'storage-zone', name: 'Storage', parent: 'infra' },
        { id: 'clients', name: 'Clients' },
      ],
      devices: [
        buildDevice({ id: 'router', name: 'Router', group: 'edge' }),
        buildDevice({ id: 'switch', name: 'Switch', group: 'edge' }),
        buildDevice({ id: 'truenas', name: 'TrueNAS', group: 'storage-zone' }),
        buildDevice({ id: 'backup', name: 'Backup', group: 'storage-zone' }),
        buildDevice({ id: 'workstation', name: 'Workstation', group: 'clients' }),
        buildDevice({ id: 'laptop', name: 'Laptop', group: 'clients' }),
      ],
      connections: [
        buildConnection({ from: 'router', to: 'switch' }),
        buildConnection({ from: 'switch', to: 'truenas' }),
        buildConnection({ from: 'switch', to: 'backup' }),
        buildConnection({ from: 'switch', to: 'workstation' }),
        buildConnection({ from: 'switch', to: 'laptop' }),
      ],
    })

    const graph = layout(doc)
    const byId = new Map(graph.groups.map((g) => [g.group.id, g]))
    const infra = byId.get('infra')!
    const clients = byId.get('clients')!

    expect(overlaps(infra, clients)).toBe(false)
    expect(contains(infra, byId.get('edge')!)).toBe(true)
    expect(contains(infra, byId.get('storage-zone')!)).toBe(true)

    // infra's height should stay proportionate to its own content (2 rows
    // of devices), not balloon from an unrelated sibling being dragged
    // down with it on repeated (mis-triggered) vertical-shift passes.
    expect(infra.height).toBeLessThan(DEFAULT_LAYOUT_OPTIONS.nodeHeight * 6)
  })
})

// ─── Edges ────────────────────────────────────────────────────────

describe('layout › edges', () => {
  it('produces a 2-point (straight) edge for vertically aligned nodes', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'top', name: 'Top' }),
        buildDevice({ id: 'bottom', name: 'Bottom' }),
      ],
      connections: [buildConnection({ from: 'top', to: 'bottom' })],
    })

    const graph = layout(doc)

    // A single connection between two nodes in a chain means they're in
    // separate layers, centred, so their x midpoints should align.
    const edge = findEdge(graph, 'top', 'bottom')
    expect(edge).toBeDefined()
    expect(edge!.points).toHaveLength(2)
  })

  it('produces a 4-point (Manhattan) edge for horizontally offset nodes', () => {
    // Three devices in layer 0, but only one in layer 1, plus a lateral
    // connection from a layer-0 sibling to the layer-1 device creates
    // an offset edge.
    const doc = buildDoc({
      devices: [
        buildDevice({ id: 'root', name: 'Root' }),
        buildDevice({ id: 'left', name: 'Left' }),
        buildDevice({ id: 'right', name: 'Right' }),
      ],
      connections: [
        buildConnection({ from: 'root', to: 'left' }),
        buildConnection({ from: 'root', to: 'right' }),
      ],
    })

    const graph = layout(doc)

    // root is depth 0, left and right are depth 1. If left and right are
    // side-by-side, at least one of the two edges should be offset (4 points).
    const manhattanEdges = graph.edges.filter((e) => e.points.length === 4)
    expect(manhattanEdges.length).toBeGreaterThanOrEqual(1)
  })

  it('filters out edges referencing non-existent nodes', () => {
    const doc = buildDoc({
      connections: [buildConnection({ from: 'router', to: 'ghost' })],
    })

    // "ghost" has no device entry, so it won't be in the nodeMap.
    // The edge router should still produce a graph but drop the bad edge.
    const graph = layout(doc)

    const ghostEdge = findEdge(graph, 'router', 'ghost')
    expect(ghostEdge).toBeUndefined()
  })
})

// ─── Bounds ───────────────────────────────────────────────────────

describe('layout › bounds', () => {
  it('encompasses all nodes', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
    })

    const graph = layout(doc)

    for (const node of graph.nodes) {
      expect(node.x + node.width).toBeLessThanOrEqual(graph.bounds.width)
      expect(node.y + node.height).toBeLessThanOrEqual(graph.bounds.height)
    }
  })

  it('encompasses all groups', () => {
    const doc = buildDoc({
      groups: [{ id: 'g', name: 'G' }],
      devices: [buildDevice({ id: 'srv', name: 'S', group: 'g' })],
    })

    const graph = layout(doc)

    for (const group of graph.groups) {
      expect(group.x + group.width).toBeLessThanOrEqual(graph.bounds.width)
      expect(group.y + group.height).toBeLessThanOrEqual(graph.bounds.height)
    }
  })

  it('includes padding beyond outermost elements', () => {
    const doc = buildDoc()
    const graph = layout(doc)
    const node = graph.nodes[0]

    // Bounds should extend past the node by at least groupPadding * 2.
    const pad = DEFAULT_LAYOUT_OPTIONS.groupPadding * 2
    expect(graph.bounds.width).toBeGreaterThanOrEqual(node.x + node.width + pad)
    expect(graph.bounds.height).toBeGreaterThanOrEqual(node.y + node.height + pad)
  })
})

// ─── Options ──────────────────────────────────────────────────────

describe('layout › options', () => {
  it('uses default options when none are provided', () => {
    const doc = buildDoc()
    const graph = layout(doc)

    const node = graph.nodes[0]
    expect(node.width).toBe(DEFAULT_LAYOUT_OPTIONS.nodeWidth)
    expect(node.height).toBe(DEFAULT_LAYOUT_OPTIONS.nodeHeight)
  })

  it('allows user options to override defaults', () => {
    const doc = buildDoc()
    const graph = layout(doc, { nodeWidth: 400, nodeHeight: 200 })

    const node = graph.nodes[0]
    expect(node.width).toBe(400)
    expect(node.height).toBe(200)
  })

  it('respects custom spacing between nodes', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a', name: 'A' }), buildDevice({ id: 'b', name: 'B' })],
    })

    const narrow = layout(doc, { horizontalSpacing: 20 })
    const wide = layout(doc, { horizontalSpacing: 200 })

    const narrowGap =
      findNode(narrow, 'b')!.x - (findNode(narrow, 'a')!.x + findNode(narrow, 'a')!.width)
    const wideGap = findNode(wide, 'b')!.x - (findNode(wide, 'a')!.x + findNode(wide, 'a')!.width)

    expect(wideGap).toBeGreaterThan(narrowGap)
  })
})

// ─── Meta passthrough ─────────────────────────────────────────────

describe('layout › meta', () => {
  it('passes the document meta through to the output graph', () => {
    const doc = buildDoc({ meta: { title: 'My Homelab' } })
    const graph = layout(doc)

    expect(graph.meta.title).toBe('My Homelab')
  })
})

// ─── Nested groups (Phase 2a: subgroups) ──────────────────────────

describe('layout › nested groups', () => {
  it('assigns depth 0 to a flat (no-parent) group', () => {
    const doc = buildDoc({
      groups: [{ id: 'flat', name: 'Flat' }],
      devices: [buildDevice({ id: 'srv', name: 'Server', group: 'flat' })],
    })

    const graph = layout(doc)
    const flat = graph.groups.find((g) => g.group.id === 'flat')!
    expect(flat).toBeDefined()
    expect(flat.depth).toBe(0)
  })

  it('assigns depth 1 to a one-level nested child', () => {
    const doc = buildDoc({
      groups: [
        { id: 'outer', name: 'Outer' },
        { id: 'inner', name: 'Inner', parent: 'outer' },
      ],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'outer' }),
        buildDevice({ id: 'b', name: 'B', group: 'inner' }),
      ],
      connections: [buildConnection({ from: 'a', to: 'b' })],
    })

    const graph = layout(doc)
    const outer = graph.groups.find((g) => g.group.id === 'outer')!
    const inner = graph.groups.find((g) => g.group.id === 'inner')!

    expect(outer.depth).toBe(0)
    expect(inner.depth).toBe(1)
  })

  it('assigns depths 0/1/2 for a three-level nest', () => {
    const graph = layout(buildDocWithNestedGroups())

    const outer = graph.groups.find((g) => g.group.id === 'outer')!
    const middle = graph.groups.find((g) => g.group.id === 'middle')!
    const inner = graph.groups.find((g) => g.group.id === 'inner')!

    expect(outer.depth).toBe(0)
    expect(middle.depth).toBe(1)
    expect(inner.depth).toBe(2)
  })

  it('parent rectangle encloses child rectangle plus padding on all four sides', () => {
    const doc = buildDoc({
      groups: [
        { id: 'outer', name: 'Outer' },
        { id: 'inner', name: 'Inner', parent: 'outer' },
      ],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'outer' }),
        buildDevice({ id: 'b', name: 'B', group: 'inner' }),
      ],
      connections: [buildConnection({ from: 'a', to: 'b' })],
    })

    const graph = layout(doc)
    const outer = graph.groups.find((g) => g.group.id === 'outer')!
    const inner = graph.groups.find((g) => g.group.id === 'inner')!

    // Outer's rectangle must strictly contain inner's, on every side.
    expect(outer.x).toBeLessThan(inner.x)
    expect(outer.y).toBeLessThan(inner.y)
    expect(outer.x + outer.width).toBeGreaterThan(inner.x + inner.width)
    expect(outer.y + outer.height).toBeGreaterThan(inner.y + inner.height)
  })

  it('three-level nest: each outer rectangle strictly contains its inner', () => {
    const graph = layout(buildDocWithNestedGroups())

    const outer = graph.groups.find((g) => g.group.id === 'outer')!
    const middle = graph.groups.find((g) => g.group.id === 'middle')!
    const inner = graph.groups.find((g) => g.group.id === 'inner')!

    // middle ⊂ outer
    expect(outer.x).toBeLessThan(middle.x)
    expect(outer.y).toBeLessThan(middle.y)
    expect(outer.x + outer.width).toBeGreaterThan(middle.x + middle.width)
    expect(outer.y + outer.height).toBeGreaterThan(middle.y + middle.height)

    // inner ⊂ middle
    expect(middle.x).toBeLessThan(inner.x)
    expect(middle.y).toBeLessThan(inner.y)
    expect(middle.x + middle.width).toBeGreaterThan(inner.x + inner.width)
    expect(middle.y + middle.height).toBeGreaterThan(inner.y + inner.height)
  })

  it('does not change positioned-group structure for documents without parent fields (backwards compat)', () => {
    // A document with two flat (no-parent) groups should produce exactly
    // the same number of PositionedGroup entries as before this feature.
    const doc = buildDoc({
      groups: [
        { id: 'g1', name: 'G1' },
        { id: 'g2', name: 'G2' },
      ],
      devices: [
        buildDevice({ id: 'a', name: 'A', group: 'g1' }),
        buildDevice({ id: 'b', name: 'B', group: 'g2' }),
      ],
    })

    const graph = layout(doc)
    expect(graph.groups).toHaveLength(2)
    expect(graph.groups.every((g) => (g.depth ?? 0) === 0)).toBe(true)
  })
})

describe('layout › port enumerations', () => {
  it('produces a non-null entry for every device, even those without interfaces', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a' }), buildDevice({ id: 'b' })],
    })

    const graph = layout(doc)

    expect(graph.portEnumerations.get('a')).toEqual([])
    expect(graph.portEnumerations.get('b')).toEqual([])
  })

  it('includes child devices in the enumeration map', () => {
    const doc = buildDoc({
      devices: [
        {
          id: 'host',
          name: 'Host',
          type: 'hypervisor',
          children: [{ id: 'vm', name: 'VM', type: 'vm' }],
        },
      ],
    })

    const graph = layout(doc)

    expect(graph.portEnumerations.has('host')).toBe(true)
    expect(graph.portEnumerations.has('vm')).toBe(true)
  })

  it('carries labels through enumeration on a device with labelled ports', () => {
    const doc = buildDoc({
      devices: [
        buildDevice({
          id: 'router',
          interfaces: {
            ethernet: {
              count: 5,
              ports: [
                { label: 'WAN' },
                { label: 'LAN1' },
                { label: 'LAN2' },
                { label: 'LAN3' },
                { label: 'LAN4' },
              ],
            },
          },
        }),
      ],
    })

    const graph = layout(doc)
    const ports = graph.portEnumerations.get('router')!

    expect(ports.map((p) => p.label)).toEqual(['WAN', 'LAN1', 'LAN2', 'LAN3', 'LAN4'])
  })
})

describe('layout › edge bundle', () => {
  it('sets PositionedEdge.bundle when the source connection has one', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a' }), buildDevice({ id: 'b' })],
      connections: [buildConnection({ from: 'a', to: 'b', bundle: 'trunk-1' })],
    })

    const graph = layout(doc)
    const edge = findEdge(graph, 'a', 'b')

    expect(edge).toBeDefined()
    expect(edge!.bundle).toBe('trunk-1')
  })

  it('leaves PositionedEdge.bundle undefined for connections without bundle', () => {
    const doc = buildDoc({
      devices: [buildDevice({ id: 'a' }), buildDevice({ id: 'b' })],
      connections: [buildConnection({ from: 'a', to: 'b' })],
    })

    const graph = layout(doc)
    const edge = findEdge(graph, 'a', 'b')

    expect(edge!.bundle).toBeUndefined()
  })
})

// ─── Auto-clustering ────────────────────────────────────────────────

/** Builds a doc with `core` fanning out to `leafCount` ungrouped leaves. */
function buildFanOutDoc(
  leafCount: number,
  overrides: Partial<HomelabDocument> = {},
): HomelabDocument {
  const leaves = Array.from({ length: leafCount }, (_, i) => buildDevice({ id: `leaf-${i}` }))
  return buildDoc({
    devices: [buildDevice({ id: 'core', type: 'switch' }), ...leaves],
    connections: leaves.map((leaf) => buildConnection({ from: 'core', to: leaf.id })),
    ...overrides,
  })
}

describe('layout › auto-clustering', () => {
  it('does nothing below the minimum graph size, even with a high fan-out', () => {
    // 9 devices total (1 core + 8 leaves) — below the default 25 minimum.
    const doc = buildFanOutDoc(8)

    const graph = layout(doc)

    expect(graph.groups).toHaveLength(0)
    expect(graph.nodes.find((n) => n.device.id === 'leaf-0')!.device.group).toBeUndefined()
  })

  it('clusters a high fan-out once the graph is large enough', () => {
    // 1 core + 24 leaves = 25 devices, meeting the default minimum; 24
    // ungrouped leaves comfortably clears the default fan-out threshold (6).
    const doc = buildFanOutDoc(24)

    const graph = layout(doc)

    const synthetic = graph.groups.filter((g) => g.group.synthetic)
    expect(synthetic).toHaveLength(1)
    expect(synthetic[0].group.id).toBe('__autocluster__core')

    const clusteredLeaves = graph.nodes.filter((n) => n.device.group === synthetic[0].group.id)
    expect(clusteredLeaves).toHaveLength(24)
  })

  it('excludes devices already in an author-defined group', () => {
    const doc = buildFanOutDoc(24, { groups: [{ id: 'rack', name: 'Rack' }] })
    doc.devices[1].group = 'rack' // leaf-0 already grouped by the author

    const graph = layout(doc)

    const synthetic = graph.groups.find((g) => g.group.synthetic)!
    const clusteredIds = graph.nodes
      .filter((n) => n.device.group === synthetic.group.id)
      .map((n) => n.device.id)

    expect(clusteredIds).not.toContain('leaf-0')
    expect(clusteredIds).toHaveLength(23)
  })

  it('excludes a child that has connection-children of its own (not a leaf)', () => {
    const doc = buildFanOutDoc(24)
    // leaf-0 fans out further, so it isn't a true topology leaf.
    doc.devices.push(buildDevice({ id: 'grandchild' }))
    doc.connections!.push(buildConnection({ from: 'leaf-0', to: 'grandchild' }))

    const graph = layout(doc)

    const synthetic = graph.groups.find((g) => g.group.synthetic)!
    const clusteredIds = graph.nodes
      .filter((n) => n.device.group === synthetic.group.id)
      .map((n) => n.device.id)

    expect(clusteredIds).not.toContain('leaf-0')
  })

  it('never mutates the original document', () => {
    const doc = buildFanOutDoc(24)

    layout(doc)

    expect(doc.devices[1].group).toBeUndefined()
    expect(doc.groups ?? []).toHaveLength(0)
  })
})
