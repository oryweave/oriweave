import {
  assignPorts,
  getPortX,
  getInterfaceGroup,
  getEthernetRowCount,
  needsSecondaryPortRow,
  ETH_ROW_HEIGHT,
} from './ports'
import { buildGroupDepths, getDescendantGroupIds, getRootGroupId } from './groups'
import {
  DEFAULT_LAYOUT_OPTIONS,
  type HomelabDocument,
  type Device,
  type Connection,
  type Group,
  type PositionedGraph,
  type PositionedNode,
  type PositionedEdge,
  type PositionedGroup,
  type LayoutOptions,
  type Point,
} from './types'
import { enumeratePorts, type EnumeratedPort } from './ports'
import type { PortAssignment } from './ports'

interface Rect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function layout(doc: HomelabDocument, userOptions?: LayoutOptions): PositionedGraph {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...userOptions }

  // 1. Top-level devices only
  const topLevel = doc.devices.map((d): Device => ({ ...d, children: undefined }))

  // 2. Connection hierarchy for depth
  const { childrenMap, roots } = buildHierarchy(topLevel, doc.connections ?? [])

  // 2b. Auto-cluster large, ungrouped fan-outs into synthetic collapsed
  // groups. Purely a rendering artifact of this layout pass — mutates only
  // the local `topLevel` working copies, never `doc.devices`/`doc.groups`
  // (the document the user authored/exports is untouched).
  const syntheticGroups = applyAutoClustering(topLevel, doc.devices, childrenMap, opts)
  const allGroups = [...(doc.groups ?? []), ...syntheticGroups]

  // 3. BFS depth
  const depthMap = assignDepths(roots, childrenMap)

  // 4. Layers
  const layers = buildLayers(topLevel, depthMap)

  // 5. Position nodes
  const nodeMap = positionLayers(layers, allGroups, opts)

  // 6. Reroute connections targeting children
  const rerouteMap = buildRerouteMap(doc.devices)
  const visibleIds = new Set(topLevel.map((d) => d.id))
  const rerouted = rerouteConnections(doc.connections ?? [], rerouteMap, visibleIds)

  // 7. Assign ports using original devices (for interface info) and rerouted connections
  const portAssignments = assignPorts(doc.devices, rerouted)

  // 7b. Enumerate ports for every device (independent of connections).
  // The renderer consumes this so it doesn't have to re-derive port
  // identity from raw `interfaces`. Every device gets an entry, even
  // when interfaces are absent (empty array), so the renderer can
  // safely default-lookup without null checks.
  const portEnumerations = buildPortEnumerations(doc.devices)

  // 8. Group outlines — resolveGroupOverlaps computes these (via
  // positionGroups) and, if any two distinct top-level boxes still overlap
  // (nested groups add their own extra padding on top of whatever
  // positionLayers already reserved — see positionGroups' extraPad),
  // nudges the underlying node layer(s) apart and recomputes from there,
  // so the returned boxes are always consistent with final node positions.
  const groups = resolveGroupOverlaps(allGroups, topLevel, nodeMap, opts)

  // 9. Normalize
  normalizePositions(nodeMap, groups, opts.groupPadding)

  // 10. Route edges (port-aware)
  const edges = routeEdges(rerouted, nodeMap, doc.devices, portAssignments)

  // 11. Bounds
  const bounds = computeBounds(nodeMap, groups, opts)

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
    groups,
    bounds,
    meta: doc.meta,
    portAssignments,
    portEnumerations,
  }
}

/**
 * Walks the full device tree (including children) and builds a map
 * `deviceId → EnumeratedPort[]`. Children are included because port
 * assignments target them too (see `assignPorts` over `doc.devices`).
 */
function buildPortEnumerations(devices: Device[]): Map<string, EnumeratedPort[]> {
  const map = new Map<string, EnumeratedPort[]>()
  const walk = (list: Device[]) => {
    for (const d of list) {
      map.set(d.id, enumeratePorts(d))
      if (d.children) walk(d.children)
    }
  }
  walk(devices)
  return map
}

// ─── Hierarchy ────────────────────────────────────────────────────

function buildHierarchy(
  devices: Device[],
  connections: Connection[],
): {
  parentMap: Map<string, string>
  childrenMap: Map<string, string[]>
  roots: string[]
} {
  const ids = new Set(devices.map((d) => d.id))
  const parentMap = new Map<string, string>()
  const childrenMap = new Map<string, string[]>()

  for (const conn of connections) {
    if (!ids.has(conn.from) || !ids.has(conn.to)) continue
    if (!parentMap.has(conn.to)) {
      parentMap.set(conn.to, conn.from)
    }
    const existing = childrenMap.get(conn.from) ?? []
    if (!existing.includes(conn.to)) {
      existing.push(conn.to)
      childrenMap.set(conn.from, existing)
    }
  }

  const roots = devices.filter((d) => !parentMap.has(d.id)).map((d) => d.id)

  return { parentMap, childrenMap, roots }
}

/**
 * Synthesizes a collapsed group for each parent whose connection-topology
 * fan-out (from `childrenMap`) has at least `autoClusterFanoutThreshold`
 * ungrouped, leaf children — the common cause of clutter in large graphs
 * (e.g. a switch or AP with dozens of directly-connected client devices).
 *
 * Only applies once the graph exceeds `autoClusterMinGraphSize`, so small
 * graphs render identically to before this pass existed. A candidate child
 * must: not already belong to an author-defined group, have no further
 * connection-children of its own (a true topology leaf — clustering an
 * intermediate switch would hide whatever hangs off it), and have no
 * schema-nested `children` of its own for the same reason.
 *
 * Mutates the `.group` field on the given `topLevel` working copies (never
 * `originalDevices`, i.e. never `doc.devices`) so the existing group
 * positioning/collapse machinery picks the synthetic membership up for
 * free. Returns the synthesized `Group` list to fold into `doc.groups` for
 * this layout pass only.
 */
function applyAutoClustering(
  topLevel: Device[],
  originalDevices: Device[],
  childrenMap: Map<string, string[]>,
  opts: Required<LayoutOptions>,
): Group[] {
  if (topLevel.length < opts.autoClusterMinGraphSize) return []

  const topLevelById = new Map(topLevel.map((d) => [d.id, d]))
  const hasNestedChildren = new Set(
    originalDevices.filter((d) => (d.children?.length ?? 0) > 0).map((d) => d.id),
  )

  const synthetic: Group[] = []

  for (const [parentId, childIds] of childrenMap) {
    const candidates = childIds.filter((id) => {
      const device = topLevelById.get(id)
      if (!device || device.group !== undefined) return false
      if ((childrenMap.get(id)?.length ?? 0) > 0) return false
      if (hasNestedChildren.has(id)) return false
      return true
    })

    if (candidates.length < opts.autoClusterFanoutThreshold) continue

    const groupId = `__autocluster__${parentId}`
    synthetic.push({ id: groupId, name: `${candidates.length} devices`, synthetic: true })

    for (const id of candidates) {
      topLevelById.get(id)!.group = groupId
    }
  }

  return synthetic
}

function assignDepths(roots: string[], childrenMap: Map<string, string[]>): Map<string, number> {
  const depthMap = new Map<string, number>()
  const queue: Array<{ id: string; depth: number }> = roots.map((id) => ({
    id,
    depth: 0,
  }))

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (depthMap.has(id)) continue
    depthMap.set(id, depth)
    for (const childId of childrenMap.get(id) ?? []) {
      if (!depthMap.has(childId)) {
        queue.push({ id: childId, depth: depth + 1 })
      }
    }
  }

  return depthMap
}

function buildLayers(devices: Device[], depthMap: Map<string, number>): Device[][] {
  const maxDepth = Math.max(0, ...depthMap.values())
  const layers: Device[][] = Array.from({ length: maxDepth + 1 }, () => [])
  for (const d of devices) {
    const depth = depthMap.get(d.id) ?? 0
    layers[depth].push(d)
  }
  return layers
}

// ─── Node positioning ─────────────────────────────────────────────

/**
 * A device's card height starts from the fixed default but grows by one
 * port row for each of:
 *   - ethernet needing a second row to render (`getEthernetRowCount`), and
 *   - SFP/WiFi not fitting beside ethernet on its row and dropping to a row
 *     of their own (`needsSecondaryPortRow`).
 * Both are shared with PortStrip.tsx so the two can't drift apart. Ethernet
 * ports beyond what fits in two rows overflow into the renderer's "+N"
 * badge rather than growing the card further, so this adds at most two
 * extra rows total.
 */
function computeNodeHeight(device: Device, opts: Required<LayoutOptions>): number {
  const ethCount = device.interfaces?.ethernet?.count ?? 0
  const sfpCount = device.interfaces?.sfp?.count ?? 0
  const hasWifi = !!device.interfaces?.wifi

  const ethRows = getEthernetRowCount(ethCount, opts.nodeWidth)
  let extraRows = Math.max(0, ethRows - 1)
  if (needsSecondaryPortRow(ethCount, sfpCount, hasWifi, opts.nodeWidth)) {
    extraRows += 1
  }

  return opts.nodeHeight + extraRows * ETH_ROW_HEIGHT
}

/**
 * Root (outermost) group id for each grouped device in `layers`, computed
 * once up front. Ungrouped devices are simply absent from the map.
 */
function buildRootGroupMap(layers: Device[][], groups: Group[]): Map<string, string> {
  const rootGroupOf = new Map<string, string>()
  for (const layer of layers) {
    for (const device of layer) {
      if (device.group) rootGroupOf.set(device.id, getRootGroupId(device.group, groups))
    }
  }
  return rootGroupOf
}

function positionLayers(
  layers: Device[][],
  groups: Group[],
  opts: Required<LayoutOptions>,
): Map<string, PositionedNode> {
  const nodeMap = new Map<string, PositionedNode>()
  const groupGap = opts.groupPadding * 2 + 16
  const rootGroupOf = buildRootGroupMap(layers, groups)

  let currentY = 0

  for (let depth = 0; depth < layers.length; depth++) {
    const layer = layers[depth]

    // A group's box is padded above and below its member nodes
    // (`positionGroups`). The flat `verticalSpacing` gap between layers
    // doesn't reserve room for that padding, so when this layer's devices
    // belong to a completely different set of top-level groups than the
    // previous layer's, their padded boxes can overlap even though the
    // devices themselves don't — reserve extra room at exactly that
    // boundary, the same way `groupGap` already does across the
    // horizontal axis within a single layer.
    if (depth > 0) {
      const prevGroups = new Set(
        layers[depth - 1].map((d) => rootGroupOf.get(d.id)).filter((g): g is string => !!g),
      )
      const currGroups = new Set(
        layer.map((d) => rootGroupOf.get(d.id)).filter((g): g is string => !!g),
      )
      const crossesGroupBoundary =
        prevGroups.size > 0 &&
        currGroups.size > 0 &&
        ![...prevGroups].some((g) => currGroups.has(g))
      if (crossesGroupBoundary) {
        currentY += opts.groupPadding
      }
    }

    const gaps: number[] = []
    for (let i = 1; i < layer.length; i++) {
      const prevGroup = layer[i - 1].group ?? ''
      const currGroup = layer[i].group ?? ''
      const sameGroup = prevGroup !== '' && currGroup !== '' && prevGroup === currGroup
      gaps.push(sameGroup ? opts.horizontalSpacing : Math.max(opts.horizontalSpacing, groupGap))
    }

    const totalGaps = gaps.reduce((sum, g) => sum + g, 0)
    const layerWidth = layer.length * opts.nodeWidth + totalGaps
    let cursorX = -layerWidth / 2

    let rowHeight = opts.nodeHeight

    for (let i = 0; i < layer.length; i++) {
      const device = layer[i]
      const height = computeNodeHeight(device, opts)
      rowHeight = Math.max(rowHeight, height)

      nodeMap.set(device.id, {
        device,
        x: cursorX,
        y: currentY,
        width: opts.nodeWidth,
        height,
        depth,
      })

      cursorX += opts.nodeWidth
      if (i < gaps.length) {
        cursorX += gaps[i]
      }
    }

    currentY += rowHeight + opts.verticalSpacing
  }

  return nodeMap
}

// ─── Connection rerouting ─────────────────────────────────────────

function buildRerouteMap(devices: Device[]): Map<string, string> {
  const map = new Map<string, string>()
  const mapDescendants = (children: Device[], target: string) => {
    for (const child of children) {
      map.set(child.id, target)
      if (child.children) mapDescendants(child.children, target)
    }
  }
  for (const d of devices) {
    if (d.children) mapDescendants(d.children, d.id)
  }
  return map
}

function rerouteConnections(
  connections: Connection[],
  rerouteMap: Map<string, string>,
  visibleIds: Set<string>,
): Connection[] {
  // Dedup only applies to pairs that collide *because* rerouting collapsed
  // distinct endpoints onto the same visible device (e.g. several children
  // rerouted onto their shared parent). A pair that was already identical
  // before rerouting — a genuine author-declared parallel link between two
  // top-level devices — must survive as a separate edge.
  const rerouted = new Set<string>()

  for (const conn of connections) {
    const from = rerouteMap.get(conn.from) ?? conn.from
    const to = rerouteMap.get(conn.to) ?? conn.to
    if (from !== conn.from || to !== conn.to) {
      rerouted.add(`${from}→${to}`)
    }
  }

  const seen = new Set<string>()
  const result: Connection[] = []

  for (const conn of connections) {
    const from = rerouteMap.get(conn.from) ?? conn.from
    const to = rerouteMap.get(conn.to) ?? conn.to

    if (!visibleIds.has(from) || !visibleIds.has(to)) continue
    if (from === to) continue

    const key = `${from}→${to}`
    if (rerouted.has(key)) {
      if (seen.has(key)) continue
      seen.add(key)
    }

    result.push({ ...conn, from, to })
  }

  return result
}

// ─── Edge routing (port-aware) ────────────────────────────────────

function routeEdges(
  connections: Connection[],
  nodeMap: Map<string, PositionedNode>,
  originalDevices: Device[],
  portAssignments: Map<string, PortAssignment[]>,
): PositionedEdge[] {
  // Build a lookup for original devices (with interfaces)
  const deviceLookup = new Map<string, Device>()
  const walkDevices = (devs: Device[]) => {
    for (const d of devs) {
      deviceLookup.set(d.id, d)
      if (d.children) walkDevices(d.children)
    }
  }
  walkDevices(originalDevices)

  // For channel routing: group by gap
  interface EdgeInfo {
    connection: Connection
    fromNode: PositionedNode
    toNode: PositionedNode
    exitX: number
    exitY: number
    entryX: number
    entryY: number
    gapKey: string
    fromPortIndex?: number
    toPortIndex?: number
  }

  const edgeInfos: EdgeInfo[] = []

  // Default fan-out tracking
  const bySource = new Map<string, Connection[]>()
  const byTarget = new Map<string, Connection[]>()
  for (const conn of connections) {
    if (!nodeMap.has(conn.from) || !nodeMap.has(conn.to)) continue
    const sf = bySource.get(conn.from) ?? []
    sf.push(conn)
    bySource.set(conn.from, sf)
    const tf = byTarget.get(conn.to) ?? []
    tf.push(conn)
    byTarget.set(conn.to, tf)
  }

  // When two or more connections share the same from→to pair (parallel
  // links), `assignPorts` gave each one its own PortAssignment — but they're
  // indistinguishable by `connectedTo` alone. Track how many connections for
  // a given pair we've already resolved, so each one consumes its own entry
  // instead of every one of them grabbing the first match.
  const pairOccurrence = new Map<string, number>()

  for (const conn of connections) {
    const fromNode = nodeMap.get(conn.from)
    const toNode = nodeMap.get(conn.to)
    if (!fromNode || !toNode) continue

    const fromDevice = deviceLookup.get(conn.from)
    const toDevice = deviceLookup.get(conn.to)

    // Find port assignments for this connection
    const fromPorts = portAssignments.get(conn.from) ?? []
    const toPorts = portAssignments.get(conn.to) ?? []
    const pairKey = `${conn.from}→${conn.to}`
    const occurrence = pairOccurrence.get(pairKey) ?? 0
    pairOccurrence.set(pairKey, occurrence + 1)

    const fromMatches = fromPorts.filter(
      (p) => p.connectedTo === conn.to && p.interfaceType !== 'wifi',
    )
    const toMatches = toPorts.filter(
      (p) => p.connectedTo === conn.from && p.interfaceType !== 'wifi',
    )
    const fromPort = fromMatches[occurrence] ?? fromMatches[0]
    const toPort = toMatches[occurrence] ?? toMatches[0]

    let exitX: number
    let entryX: number

    // Compute exit X: port-level or fan-spread fallback
    if (fromPort && fromDevice?.interfaces) {
      const iface = getInterfaceGroup(fromDevice, fromPort.interfaceType)
      const totalPorts = iface?.count ?? 1
      exitX = fromNode.x + getPortX(fromPort.portIndex, totalPorts, fromNode.width)
    } else {
      // Fan-spread fallback
      const siblings = bySource.get(conn.from) ?? [conn]
      const sibIndex = siblings.indexOf(conn)
      const sibCount = siblings.length
      const spread = Math.min(fromNode.width * 0.6, sibCount * 20)
      const center = fromNode.x + fromNode.width / 2
      exitX = sibCount === 1 ? center : center - spread / 2 + (sibIndex / (sibCount - 1)) * spread
    }

    // Compute entry X: port-level or fan-spread fallback
    if (toPort && toDevice?.interfaces) {
      const iface = getInterfaceGroup(toDevice, toPort.interfaceType)
      const totalPorts = iface?.count ?? 1
      entryX = toNode.x + getPortX(toPort.portIndex, totalPorts, toNode.width)
    } else {
      const targetSiblings = byTarget.get(conn.to) ?? [conn]
      const targetIndex = targetSiblings.indexOf(conn)
      const targetCount = targetSiblings.length
      const spread = Math.min(toNode.width * 0.6, targetCount * 20)
      const center = toNode.x + toNode.width / 2
      entryX =
        targetCount === 1
          ? center
          : center - spread / 2 + (targetIndex / (targetCount - 1)) * spread
    }

    const exitY = fromNode.y + fromNode.height
    const entryY = toNode.y
    const gapKey = `${fromNode.depth}→${toNode.depth}`

    edgeInfos.push({
      connection: conn,
      fromNode,
      toNode,
      exitX,
      exitY,
      entryX,
      entryY,
      gapKey,
      fromPortIndex: fromPort?.portIndex,
      toPortIndex: toPort?.portIndex,
    })
  }

  // Assign channels per gap
  const gapGroups = new Map<string, EdgeInfo[]>()
  for (const info of edgeInfos) {
    const list = gapGroups.get(info.gapKey) ?? []
    list.push(info)
    gapGroups.set(info.gapKey, list)
  }

  const channelMap = new Map<EdgeInfo, number>()

  for (const [, group] of gapGroups) {
    if (group.length === 0) continue

    const sorted = [...group].sort((a, b) => a.entryX - b.entryX)
    const gapTop = Math.min(...sorted.map((e) => e.exitY))
    const gapBottom = Math.max(...sorted.map((e) => e.entryY))

    const margin = 15
    const usableTop = gapTop + margin
    const usableBottom = gapBottom - margin
    const usableSpace = usableBottom - usableTop
    const minSpacing = 8
    const count = sorted.length

    if (count === 1) {
      channelMap.set(sorted[0], (usableTop + usableBottom) / 2)
    } else {
      const idealSpacing = usableSpace / (count - 1)
      const spacing = Math.max(minSpacing, idealSpacing)
      const totalNeeded = spacing * (count - 1)
      const startY = usableTop + (usableSpace - totalNeeded) / 2
      for (let i = 0; i < count; i++) {
        channelMap.set(sorted[i], startY + i * spacing)
      }
    }
  }

  // Build paths
  return edgeInfos.map((info) => {
    const channelY = channelMap.get(info)!
    const isAligned = Math.abs(info.exitX - info.entryX) < 6

    let points: Point[]
    if (isAligned) {
      points = [
        { x: info.exitX, y: info.exitY },
        { x: info.entryX, y: info.entryY },
      ]
    } else {
      points = [
        { x: info.exitX, y: info.exitY },
        { x: info.exitX, y: channelY },
        { x: info.entryX, y: channelY },
        { x: info.entryX, y: info.entryY },
      ]
    }

    return {
      connection: info.connection,
      points,
      fromNodeId: info.connection.from,
      toNodeId: info.connection.to,
      fromPortIndex: info.fromPortIndex,
      toPortIndex: info.toPortIndex,
      ...(info.connection.bundle !== undefined ? { bundle: info.connection.bundle } : {}),
    }
  })
}

// ─── Groups ───────────────────────────────────────────────────────

/**
 * Positions group outlines.
 *
 * For groups WITHOUT descendants (leaves of the parent-tree), the
 * existing cluster-splitting behavior is preserved: if a group's
 * members span non-adjacent layers, the outline splits into separate
 * boxes per cluster, and only the first cluster gets the label.
 *
 * For groups WITH descendants (any group that another group's
 * `parent` field references), the outline collapses to a SINGLE
 * rectangle that encloses:
 *   - all of its own member-cluster rectangles, AND
 *   - every descendant group's rectangle(s),
 * with padding scaled by depth so the nesting reads visibly.
 *
 * Every PositionedGroup carries a `depth` derived from the parent
 * chain (0 = top-level), which the renderer uses for visual cues.
 */
function positionGroups(
  groups: HomelabDocument['groups'],
  devices: Device[],
  nodeMap: Map<string, PositionedNode>,
  opts: Required<LayoutOptions>,
): PositionedGroup[] {
  if (!groups) return []

  const depthMap = buildGroupDepths(groups)
  const hasDescendants = new Set<string>()
  for (const g of groups) {
    if (g.parent) hasDescendants.add(g.parent)
  }

  const pad = opts.groupPadding
  const topPad = pad + 16

  // First pass: compute one or more rectangles for each group based on
  // its own members. This is the existing cluster-split behaviour,
  // kept intact for backwards compatibility.
  const ownRectsByGroup = new Map<string, PositionedGroup[]>()

  for (const group of groups) {
    const memberNodes = devices
      .filter((d) => d.group === group.id)
      .map((m) => nodeMap.get(m.id))
      .filter(Boolean) as PositionedNode[]

    if (memberNodes.length === 0) {
      ownRectsByGroup.set(group.id, [])
      continue
    }

    const clusters = clusterByConsecutiveDepth(memberNodes)
    const rects: PositionedGroup[] = []

    for (let ci = 0; ci < clusters.length; ci++) {
      const bounds = boundingBox(clusters[ci])
      if (!bounds) continue
      const isFirst = ci === 0

      rects.push({
        group: isFirst ? group : { ...group, name: '' }, // empty name hides the label on extra clusters
        x: bounds.minX - pad,
        y: bounds.minY - (isFirst ? topPad : pad),
        width: bounds.maxX - bounds.minX + pad * 2,
        height: bounds.maxY - bounds.minY + (isFirst ? topPad : pad) + pad,
        depth: depthMap.get(group.id) ?? 0,
      })
    }

    ownRectsByGroup.set(group.id, rects)
  }

  // Second pass: for each non-leaf group (has descendants), collapse
  // its rectangles into a single enclosing box that also contains all
  // descendant rectangles, with depth-scaled extra padding.
  const result: PositionedGroup[] = []

  for (const group of groups) {
    const ownRects = ownRectsByGroup.get(group.id) ?? []

    if (!hasDescendants.has(group.id)) {
      // Leaf group — preserve cluster-split behaviour exactly.
      result.push(...ownRects)
      continue
    }

    // Non-leaf: collect every rectangle from descendants + own.
    const descendantIds = getDescendantGroupIds(group.id, groups)
    const allRects: PositionedGroup[] = [...ownRects]
    for (const id of descendantIds) {
      allRects.push(...(ownRectsByGroup.get(id) ?? []))
    }

    if (allRects.length === 0) continue

    const bounds = unionBounds(allRects)
    if (!bounds) continue

    // Extra padding so nested rings read visibly. Each level of nesting
    // pushes the outer ring out by half a groupPadding.
    const depth = depthMap.get(group.id) ?? 0
    const maxDescendantDepth = Math.max(
      depth,
      ...Array.from(descendantIds, (id) => depthMap.get(id) ?? 0),
    )
    const nestingLevels = maxDescendantDepth - depth
    const extraPad = (nestingLevels + 1) * (pad / 2)

    result.push({
      group,
      x: bounds.minX - extraPad,
      y: bounds.minY - extraPad - 16, // 16 for label space on the parent
      width: bounds.maxX - bounds.minX + extraPad * 2,
      height: bounds.maxY - bounds.minY + extraPad * 2 + 16,
      depth,
    })
  }

  return result
}

/** The BFS depths of a group's own member devices, across its full descendant subtree. */
function subtreeMemberDepths(
  groupId: string,
  groups: Group[],
  topLevel: Device[],
  nodeMap: Map<string, PositionedNode>,
): number[] {
  const subtree = new Set([groupId, ...getDescendantGroupIds(groupId, groups)])
  return topLevel
    .filter((d) => d.group !== undefined && subtree.has(d.group))
    .map((d) => nodeMap.get(d.id)?.depth)
    .filter((d): d is number => d !== undefined)
}

/**
 * Computes group boxes (via `positionGroups`) and, if any two distinct
 * top-level boxes (`depth === 0` — nested children are never the cause of
 * an overlap independent of their own top-level ancestor, since they're
 * always contained within it by construction) still overlap, pushes them
 * apart and recomputes.
 *
 * Deliberately does NOT patch group-box coordinates directly: a box's
 * geometry is derived from its member nodes, and a parent's box can be
 * numerically *outside* where its own children's boxes start (its extra
 * nesting padding extends further out — see `extraPad` above). Patching
 * boxes by a raw coordinate threshold can catch a descendant whose box
 * clears the threshold while missing its ancestor, whose box doesn't —
 * moving a child out from under its own parent's outline. Shifting the
 * *nodes* instead and then calling `positionGroups` again keeps every box,
 * nested or not, always freshly consistent with where its members ended up.
 *
 * Two groups can collide on either axis: stacked in adjacent layers (needs
 * more vertical room — the `k3s-cluster` under `edge` case), or side by
 * side in the *same* layer (needs more horizontal room — a wide nested
 * group crowding a plain sibling group next to it, e.g. `k3s-cluster` vs
 * `storage-tier`).
 *
 * Distinguished by each group's *depth range* — not just its shallowest
 * depth: a group can span several depths (e.g. `infra` wraps `edge` at
 * depth 0 *and* `storage-zone` down at depth 2), so comparing only the
 * minimum would misjudge it as "different rows" from a depth-2-only
 * sibling it actually shares a row with at that depth, triggering a
 * vertical shift that (harmlessly for `edge`, but pointlessly) drags the
 * whole subtree down on every pass. Overlapping ranges means "shares a
 * row" at the intersecting depths — shift sideways; disjoint ranges means
 * genuinely stacked — shift the whole later layer (and everything after
 * it) down.
 *
 * The horizontal shift moves the *entire* higher-x top-level group
 * (whichever one it is, in full — not just its slice at the intersecting
 * depths) by the amount needed to clear the other's actual box. This
 * deliberately never touches the lower-x group or any of its own nested
 * content: shifting only part of it (or splitting the gap between both
 * sides) sounds more "balanced," but a group's rendered box is one
 * rectangle sized by its *widest* content at any depth (e.g. `infra`'s
 * box is exactly as wide as `edge` requires, even where `storage-zone`
 * alone would need less) — computing the needed clearance from anything
 * narrower than that full box underestimates it. Note: per-layer
 * centering elsewhere in positionLayers means a group sharing a depth
 * layer with unrelated content (e.g. `storage-zone` sharing depth 2 with
 * `clients`) can end up visually off-center under its own parent — that's
 * an inherent property of centering each layer independently, not
 * something this pass causes or can fix without moving the OTHER group's
 * own content, which would just relocate the asymmetry rather than remove it.
 */
function resolveGroupOverlaps(
  groups: Group[],
  topLevel: Device[],
  nodeMap: Map<string, PositionedNode>,
  opts: Required<LayoutOptions>,
): PositionedGroup[] {
  let positioned = positionGroups(groups, topLevel, nodeMap, opts)

  for (let pass = 0; pass < groups.length + topLevel.length + 1; pass++) {
    const topLevelBoxes = positioned.filter((g) => (g.depth ?? 0) === 0)
    if (topLevelBoxes.length < 2) return positioned

    let shifted = false

    outer: for (let i = 0; i < topLevelBoxes.length; i++) {
      for (let j = i + 1; j < topLevelBoxes.length; j++) {
        const a = topLevelBoxes[i]
        const b = topLevelBoxes[j]

        const xOverlap = a.x < b.x + b.width && a.x + a.width > b.x
        const yOverlap = a.y < b.y + b.height && a.y + a.height > b.y
        if (!xOverlap || !yOverlap) continue

        const aDepths = subtreeMemberDepths(a.group.id, groups, topLevel, nodeMap)
        const bDepths = subtreeMemberDepths(b.group.id, groups, topLevel, nodeMap)
        if (aDepths.length === 0 || bDepths.length === 0) continue

        const aMin = Math.min(...aDepths)
        const aMax = Math.max(...aDepths)
        const bMin = Math.min(...bDepths)
        const bMax = Math.max(...bDepths)
        const rangesOverlap = aMin <= bMax && bMin <= aMax

        if (rangesOverlap) {
          // Always move the group with the narrower depth range ("simple")
          // in full, never the wider ("complex") one — moving a slice of
          // the complex side risks leaving its own rendered box (sized by
          // its widest content at ANY depth, not just this band) still
          // colliding, and moving all of it would drag unrelated content
          // at its other depths along for no reason. The simple side, by
          // definition, has nothing outside this band to protect.
          const aBreadth = aMax - aMin
          const bBreadth = bMax - bMin
          const [simple, complex] = aBreadth <= bBreadth ? [a, b] : [b, a]

          const shift =
            simple.x <= complex.x
              ? simple.x + simple.width + opts.groupPadding - complex.x
              : complex.x + complex.width + opts.groupPadding - simple.x
          if (shift <= 0) continue
          const signedShift = simple.x <= complex.x ? -shift : shift

          const simpleSubtree = new Set([
            simple.group.id,
            ...getDescendantGroupIds(simple.group.id, groups),
          ])
          for (const d of topLevel) {
            if (d.group === undefined || !simpleSubtree.has(d.group)) continue
            const node = nodeMap.get(d.id)
            if (node) node.x += signedShift
          }
        } else {
          const [upper, lower] = aMax < bMin ? [a, b] : [b, a]
          const shift = upper.y + upper.height + opts.groupPadding - lower.y
          if (shift <= 0) continue
          const lowerMin = a === lower ? aMin : bMin
          for (const node of nodeMap.values()) {
            if (node.depth >= lowerMin) node.y += shift
          }
        }

        positioned = positionGroups(groups, topLevel, nodeMap, opts)
        shifted = true
        break outer
      }
    }

    if (!shifted) break
  }

  return positioned
}

/** Bounding box of a set of positioned nodes; null if empty. */
function boundingBox(nodes: PositionedNode[]): Rect | null {
  if (nodes.length === 0) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width)
    maxY = Math.max(maxY, n.y + n.height)
  }
  if (!isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

/** Union bounding box of a set of positioned-group rectangles; null if empty. */
function unionBounds(rects: PositionedGroup[]): Rect | null {
  if (rects.length === 0) return null
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.width)
    maxY = Math.max(maxY, r.y + r.height)
  }
  if (!isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

/**
 * Splits positioned nodes into clusters of consecutive layer depths.
 * Two nodes belong to the same cluster iff their `depth` values can be
 * reached without skipping a depth (i.e. no gap > 1 in the sorted list
 * of depths represented).
 */
function clusterByConsecutiveDepth(nodes: PositionedNode[]): PositionedNode[][] {
  const byDepth = new Map<number, PositionedNode[]>()
  for (const node of nodes) {
    const list = byDepth.get(node.depth) ?? []
    list.push(node)
    byDepth.set(node.depth, list)
  }
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b)

  const clusters: PositionedNode[][] = []
  let current: PositionedNode[] = []
  let lastDepth = -Infinity

  for (const depth of depths) {
    if (depth - lastDepth > 1 && current.length > 0) {
      clusters.push(current)
      current = []
    }
    current.push(...byDepth.get(depth)!)
    lastDepth = depth
  }
  if (current.length > 0) clusters.push(current)

  return clusters
}

// ─── Normalization & bounds ───────────────────────────────────────

function normalizePositions(
  nodeMap: Map<string, PositionedNode>,
  groups: PositionedGroup[],
  padding: number,
): void {
  let minX = Infinity
  let minY = Infinity

  for (const node of nodeMap.values()) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
  }
  for (const g of groups) {
    minX = Math.min(minX, g.x)
    minY = Math.min(minY, g.y)
  }

  const shiftX = -minX + padding
  const shiftY = -minY + padding

  for (const node of nodeMap.values()) {
    node.x += shiftX
    node.y += shiftY
  }
  for (const g of groups) {
    g.x += shiftX
    g.y += shiftY
  }
}

function computeBounds(
  nodeMap: Map<string, PositionedNode>,
  groups: PositionedGroup[],
  opts: Required<LayoutOptions>,
): { width: number; height: number } {
  let maxX = 0
  let maxY = 0

  for (const node of nodeMap.values()) {
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }

  for (const g of groups) {
    maxX = Math.max(maxX, g.x + g.width)
    maxY = Math.max(maxY, g.y + g.height)
  }

  const pad = opts.groupPadding * 2
  return { width: maxX + pad, height: maxY + pad }
}

export { layout }
