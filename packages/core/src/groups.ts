/**
 * Group-tree helpers for nested (parent-linked) groups.
 *
 * These exist as a separate module so layout.ts doesn't have to know
 * about parent-chain walking or cycle detection, and so the validator
 * can share the same cycle-finding routine.
 */
import type { Group } from './types'

/**
 * Walks each group's parent chain to compute its nesting depth.
 * Returns a map of `group.id → depth`, where depth 0 means top-level.
 *
 * Assumes the input is cycle-free. The validator catches cycles
 * separately via {@link findGroupCycle}; if a cycle slips through,
 * depth for groups inside the cycle is reported as 0 to avoid an
 * infinite loop, but the visual result is undefined.
 */
export function buildGroupDepths(groups: Group[]): Map<string, number> {
  const byId = new Map(groups.map((g) => [g.id, g]))
  const depths = new Map<string, number>()

  for (const group of groups) {
    let depth = 0
    let cursor: Group | undefined = group
    const visited = new Set<string>()

    while (cursor?.parent) {
      if (visited.has(cursor.id)) {
        depth = 0
        break
      }
      visited.add(cursor.id)

      const parent = byId.get(cursor.parent)
      if (!parent) break
      depth++
      cursor = parent
    }

    depths.set(group.id, depth)
  }

  return depths
}

/**
 * Detects the first non-trivial cycle reachable from any group via its
 * parent chain. Returns the id of the group whose `parent` link closes
 * the cycle, or `null` if no cycle exists.
 *
 * Self-references (`group.parent === group.id`) are NOT reported here —
 * the validator handles those as a separate, more specific error.
 */
export function findGroupCycle(groups: Group[]): string | null {
  const byId = new Map(groups.map((g) => [g.id, g]))

  for (const start of groups) {
    if (!start.parent) continue
    if (start.parent === start.id) continue

    const visited = new Set<string>([start.id])
    let cursor: Group | undefined = byId.get(start.parent)

    while (cursor?.parent) {
      if (cursor.parent === cursor.id) break
      if (visited.has(cursor.id)) {
        return cursor.id
      }
      visited.add(cursor.id)
      cursor = byId.get(cursor.parent)
    }
  }

  return null
}

/**
 * Walks a group's parent chain to find its outermost (root) ancestor id.
 * Returns the group's own id when it has no parent. Assumes cycle-free
 * input, matching {@link buildGroupDepths}' contract.
 */
export function getRootGroupId(groupId: string, groups: Group[]): string {
  const byId = new Map(groups.map((g) => [g.id, g]))
  const visited = new Set<string>()
  let cursor = byId.get(groupId)
  let result = groupId

  while (cursor?.parent) {
    if (visited.has(cursor.id)) break
    visited.add(cursor.id)
    const parent = byId.get(cursor.parent)
    if (!parent) break
    result = parent.id
    cursor = parent
  }

  return result
}

/**
 * Returns the set of group ids that are descendants of `rootId`
 * (transitive children via the `parent` field), excluding `rootId` itself.
 */
export function getDescendantGroupIds(rootId: string, groups: Group[]): Set<string> {
  const childrenOf = new Map<string, string[]>()
  for (const g of groups) {
    if (!g.parent) continue
    const list = childrenOf.get(g.parent) ?? []
    list.push(g.id)
    childrenOf.set(g.parent, list)
  }

  const descendants = new Set<string>()
  const stack = [...(childrenOf.get(rootId) ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (descendants.has(id)) continue
    descendants.add(id)
    for (const childId of childrenOf.get(id) ?? []) {
      stack.push(childId)
    }
  }

  return descendants
}
