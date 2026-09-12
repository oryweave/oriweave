import type { Device } from '@oriweave/core'

/**
 * Tiebreak order for representative-icon selection on collapsed
 * supernodes. The first type in this list "wins" when multiple types
 * are equally prevalent in a group. Conceptually: most "infra-level"
 * device types appear earliest, so a mixed group of a router + some
 * laptops resolves to "router".
 *
 * Per the handoff: router > switch > server > hypervisor > container >
 * nas > ap > laptop > phone > iot > camera > tv > device.
 */
const TIEBREAK_ORDER: readonly string[] = [
  'router',
  'switch',
  'server',
  'hypervisor',
  'container',
  'nas',
  'ap',
  'laptop',
  'phone',
  'iot',
  'camera',
  'tv',
  'device',
]

/**
 * Picks the representative device-type icon for a collapsed group.
 *
 * Rules:
 *   1. If a single type holds ≥ 80% of the group, that type wins
 *      outright.
 *   2. Otherwise the type with the largest member count wins.
 *   3. Ties are broken by `TIEBREAK_ORDER` — earlier entries win.
 *      A type not in the order is ranked last, in insertion order
 *      from the input.
 *   4. An empty input returns `"device"` — a safe generic fallback.
 *
 * This is a pure function for testability.
 */
export function resolveSupernodeIcon(devices: readonly Device[]): string {
  if (devices.length === 0) return 'device'

  // Count occurrences of each type, preserving first-seen order for
  // deterministic tiebreaks among types not in TIEBREAK_ORDER.
  const counts = new Map<string, number>()
  for (const d of devices) {
    counts.set(d.type, (counts.get(d.type) ?? 0) + 1)
  }

  // 80% majority short-circuits the tiebreak entirely.
  const threshold = devices.length * 0.8
  for (const [type, count] of counts) {
    if (count >= threshold) return type
  }

  // No clear majority — find the type(s) tied for the max count.
  const max = Math.max(...counts.values())
  const tied: string[] = []
  for (const [type, count] of counts) {
    if (count === max) tied.push(type)
  }

  if (tied.length === 1) return tied[0]

  // Tiebreak using the fixed priority order, then by insertion order.
  return tied.sort((a, b) => {
    const ai = TIEBREAK_ORDER.indexOf(a)
    const bi = TIEBREAK_ORDER.indexOf(b)
    const aRank = ai === -1 ? TIEBREAK_ORDER.length : ai
    const bRank = bi === -1 ? TIEBREAK_ORDER.length : bi
    return aRank - bRank
  })[0]
}
