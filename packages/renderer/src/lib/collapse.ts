import type { Group, PositionedEdge, PositionedGroup, PositionedNode } from '@oriweave/core'

/**
 * Returns the set of group ids that are descendants of `rootId`
 * (children, grandchildren, …) including `rootId` itself.
 *
 * A renderer-side duplicate of `core/groups.getDescendantGroupIds`,
 * which isn't exported. Inlined here to avoid widening the core
 * surface for a renderer-only feature. ~10 LOC of pure recursion is
 * the lesser tax.
 */
export function getGroupSubtreeIds(rootId: string, groups: readonly Group[]): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const g of groups) {
    if (!g.parent) continue
    const list = childrenOf.get(g.parent) ?? []
    list.push(g.id)
    childrenOf.set(g.parent, list)
  }

  const result = new Set<string>([rootId])
  const stack = [...(childrenOf.get(rootId) ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (result.has(id)) continue
    result.add(id)
    for (const childId of childrenOf.get(id) ?? []) {
      stack.push(childId)
    }
  }
  return result
}

/**
 * Maps every device id to the id of the *outermost* collapsed group
 * that contains it. Used by:
 *   - DeviceCard rendering: skip devices whose id maps to a collapsed
 *     group (the supernode renders in their place).
 *   - Edge re-routing: an edge whose endpoint maps to a collapsed
 *     group either re-anchors (one side mapped) or hides (both sides
 *     mapped to the *same* group).
 *
 * "Outermost" matters when groups nest *and* both are collapsed: the
 * supernode is owned by the higher-up group so the inner one
 * effectively disappears, matching the visual intent of "collapse
 * the whole subtree under this puck."
 */
export function buildDeviceToCollapsedGroupMap(
  collapsedGroupIds: ReadonlySet<string>,
  groups: readonly Group[],
  nodes: readonly PositionedNode[],
): Map<string, string> {
  if (collapsedGroupIds.size === 0) return new Map()

  const subtrees = new Map<string, Set<string>>()
  for (const gid of collapsedGroupIds) {
    subtrees.set(gid, getGroupSubtreeIds(gid, groups))
  }

  const groupsById = new Map(groups.map((g) => [g.id, g]))
  const ancestorChain = (gid: string): string[] => {
    const chain: string[] = []
    let cursor = groupsById.get(gid)
    const seen = new Set<string>()
    while (cursor) {
      if (seen.has(cursor.id)) break
      seen.add(cursor.id)
      chain.push(cursor.id)
      cursor = cursor.parent ? groupsById.get(cursor.parent) : undefined
    }
    return chain
  }

  const deviceToCollapsed = new Map<string, string>()
  for (const node of nodes) {
    const directGroup = node.device.group
    if (!directGroup) continue

    // Walk this device's group chain from inside out; the *last*
    // collapsed group on the chain is the outermost.
    let outermostCollapsed: string | undefined
    for (const ancestorId of ancestorChain(directGroup)) {
      if (collapsedGroupIds.has(ancestorId)) outermostCollapsed = ancestorId
    }
    if (outermostCollapsed !== undefined) {
      deviceToCollapsed.set(node.device.id, outermostCollapsed)
    }

    // Sanity check: the device's group is a member of the collapsed
    // subtree if any. We use ancestor walking above instead of a
    // subtree containment check because the subtree map gives us the
    // children, not the membership. The ancestor walk is correct.
    void subtrees
  }

  return deviceToCollapsed
}

/**
 * Returns the ids of groups the layout engine auto-synthesized for a large,
 * ungrouped fan-out (`Group.synthetic`, see `core/layout.ts`). Used to seed
 * `collapsedGroupIds` so these start collapsed by default — unlike
 * author-defined groups, which start expanded.
 */
export function selectAutoCollapsedGroupIds(groups: readonly Group[]): Set<string> {
  return new Set(groups.filter((g) => g.synthetic).map((g) => g.id))
}

/**
 * Returns the centre point of a group's bounding box as the position
 * where its supernode renders. The puck size is added by the caller;
 * this returns the *centre*, not the top-left.
 */
export function supernodeCentre(group: PositionedGroup): { x: number; y: number } {
  return {
    x: group.x + group.width / 2,
    y: group.y + group.height / 2,
  }
}

/**
 * Counts devices inside a group (recursively across nested groups).
 * Used for the `×N` badge.
 */
export function countDevicesInGroup(
  groupId: string,
  groups: readonly Group[],
  nodes: readonly PositionedNode[],
): number {
  const subtree = getGroupSubtreeIds(groupId, groups)
  let count = 0
  for (const node of nodes) {
    if (node.device.group && subtree.has(node.device.group)) count++
  }
  return count
}

/**
 * Applies collapse re-routing to an edge:
 *   - Returns `null` if both endpoints are inside the same collapsed
 *     group (edge is encapsulated, hide).
 *   - Returns a new edge with affected endpoint(s) re-anchored to the
 *     respective supernode centre(s) otherwise.
 *   - Returns the edge unchanged when neither endpoint is collapsed.
 *
 * Re-anchoring uses a straight line from supernode centre to the
 * non-collapsed endpoint (or between two supernodes), per the
 * handoff: "ship the basic re-anchoring first". Trunk-merging when
 * many edges stack on the same two supernodes is intentionally NOT
 * implemented here — left as a future polish task.
 */
export function rerouteEdgeForCollapse(
  edge: PositionedEdge,
  deviceToCollapsed: ReadonlyMap<string, string>,
  groupToCentre: ReadonlyMap<string, { x: number; y: number }>,
): PositionedEdge | null {
  const fromCollapsed = deviceToCollapsed.get(edge.fromNodeId)
  const toCollapsed = deviceToCollapsed.get(edge.toNodeId)

  if (fromCollapsed === undefined && toCollapsed === undefined) return edge
  if (fromCollapsed !== undefined && fromCollapsed === toCollapsed) return null

  const fromPoint =
    fromCollapsed !== undefined
      ? (groupToCentre.get(fromCollapsed) ?? edge.points[0])
      : edge.points[0]
  const toPoint =
    toCollapsed !== undefined
      ? (groupToCentre.get(toCollapsed) ?? edge.points[edge.points.length - 1])
      : edge.points[edge.points.length - 1]

  return {
    ...edge,
    points: [fromPoint, toPoint],
  }
}
