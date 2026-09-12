import type { PositionedEdge } from '@oriweave/core'

/**
 * Focus-mode neighbour computation.
 *
 * Pure derivation: given a focused node id, a depth (1 or 2), and the
 * edge list, BFS the undirected edge graph and return every node id
 * within `depth` hops of the focus (inclusive of the focus itself).
 *
 * `depth === 0` means "no focus active" — the caller renders normally
 * and should not invoke this function with a zero depth. The function
 * still handles it defensively by returning a set containing only the
 * focused id (selection-only state).
 *
 * Caller is expected to memoise on `(focusedNodeId, depth, edges.length)`.
 */
export function computeFocusedNodeIds(
  focusedNodeId: string,
  depth: number,
  edges: readonly PositionedEdge[],
): Set<string> {
  const focused = new Set<string>([focusedNodeId])
  if (depth <= 0) return focused

  // Build undirected adjacency map once per call. Edges are sparse
  // relative to nodes in typical homelab topologies, so the map cost
  // is small and the BFS lookup is O(degree) per step.
  const adjacency = new Map<string, Set<string>>()
  for (const edge of edges) {
    const a = edge.fromNodeId
    const b = edge.toNodeId
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    if (!adjacency.has(b)) adjacency.set(b, new Set())
    adjacency.get(a)!.add(b)
    adjacency.get(b)!.add(a)
  }

  let frontier = new Set<string>([focusedNodeId])
  for (let hop = 0; hop < depth; hop++) {
    const nextFrontier = new Set<string>()
    for (const id of frontier) {
      const neighbours = adjacency.get(id)
      if (!neighbours) continue
      for (const n of neighbours) {
        if (focused.has(n)) continue
        focused.add(n)
        nextFrontier.add(n)
      }
    }
    if (nextFrontier.size === 0) break
    frontier = nextFrontier
  }

  return focused
}

/**
 * Returns the set of edge keys that connect two nodes both inside
 * the focused set. Used to decide which edges render at full opacity
 * and which dim down.
 *
 * Caller-provided `keyFor` lets the result key against whatever edge
 * identity scheme the renderer is already using (avoids forcing a
 * shared convention here).
 */
export function computeFocusedEdgeKeys(
  focusedNodeIds: ReadonlySet<string>,
  edges: readonly PositionedEdge[],
  keyFor: (edge: PositionedEdge) => string,
): Set<string> {
  const keys = new Set<string>()
  for (const edge of edges) {
    if (focusedNodeIds.has(edge.fromNodeId) && focusedNodeIds.has(edge.toNodeId)) {
      keys.add(keyFor(edge))
    }
  }
  return keys
}
