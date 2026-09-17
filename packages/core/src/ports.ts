import type { Device, Connection, InterfaceGroup } from './types'

type EnumerableInterfaceType = 'ethernet' | 'sfp' | 'usb' | 'thunderbolt' | 'wifi'

type PortResolution = { interfaceType: EnumerableInterfaceType; index: number } | { error: string }

interface PortAssignment {
  deviceId: string
  interfaceType: EnumerableInterfaceType
  portIndex: number
  connectedTo: string
  speed?: string
  label?: string
  bundle?: string
}

interface PortLayout {
  x: number
  active: boolean
  connectedTo?: string
  speed?: string
}

interface EnumeratedPort {
  interfaceType: EnumerableInterfaceType
  index: number
  label?: string
  speed?: string
}

/** Width of a single port icon + gap */
const PORT_WIDTH = 18
const PORT_GAP = 4
const PORT_STRIP_PADDING = 12

/** Port dimensions exported for the renderer */
const PORT_DIMENSIONS = {
  width: PORT_WIDTH,
  gap: PORT_GAP,
  padding: PORT_STRIP_PADDING,
} as const

/**
 * Height of a single rendered ethernet port row (icon + caption), and the
 * horizontal padding/slot math the ethernet strip wraps at. These mirror
 * PortStrip.tsx's own rendering constants (icon 18×16, 3px gap, 30px of
 * card padding) so the row-count computation below — consumed by both the
 * layout engine (card height) and the renderer (actual wrapping) — can
 * never drift out of sync between the two.
 */
const ETH_ROW_HEIGHT = 24
const ETH_PORT_SLOT_WIDTH = 21
const ETH_STRIP_HORIZONTAL_PADDING = 30
const ETH_MIN_PORTS_PER_ROW = 4
const ETH_MAX_ROWS = 2

/**
 * Width budget for the strip row's flex gap and the WiFi indicator block —
 * mirrors PortStrip.tsx's row `gap` and the WifiIndicator's rendered width
 * (icon + client-count text), used only to decide whether SFP/WiFi fit
 * beside ethernet on the same row.
 */
const PORT_STRIP_ROW_GAP = 14
const WIFI_BLOCK_WIDTH = 40

/**
 * How many ethernet ports fit on a single row at the given card width.
 * Single source of truth for both `getEthernetRowCount` below and
 * PortStrip's actual row-splitting, so they can't drift apart.
 */
function getEthernetPortsPerRow(cardWidth: number): number {
  const usableWidth = cardWidth - ETH_STRIP_HORIZONTAL_PADDING
  return Math.max(ETH_MIN_PORTS_PER_ROW, Math.floor(usableWidth / ETH_PORT_SLOT_WIDTH))
}

/**
 * How many rows the ethernet port strip needs for a given port count and
 * card width, capped at `ETH_MAX_ROWS` (ports beyond that overflow into the
 * renderer's existing "+N" badge rather than growing the card further).
 * Single source of truth for both the layout engine's card-height
 * computation and PortStrip's actual row wrapping.
 */
function getEthernetRowCount(ethCount: number, cardWidth: number): number {
  if (ethCount <= 0) return 0
  const maxPerRow = getEthernetPortsPerRow(cardWidth)
  return Math.min(ETH_MAX_ROWS, Math.ceil(ethCount / maxPerRow))
}

/**
 * Whether the SFP/WiFi block needs to drop onto its own row below ethernet
 * instead of sharing ethernet's row. Ethernet's own row already fits within
 * the card by construction (`getEthernetRowCount` caps it) — the problem is
 * that a wide ethernet row (many ports) can leave no horizontal room for
 * SFP/WiFi beside it, so they'd render past the card's right edge. Single
 * source of truth for both the layout engine's card-height computation and
 * PortStrip's actual row placement.
 *
 * Scoped to the ethernet-vs-others contention that's actually been seen in
 * practice (a high ethernet count crowding out a modest SFP count); an SFP
 * or WiFi-only device with an unusually wide SFP strip of its own is a
 * separate, still out-of-scope case (SFP never wraps within its own row).
 */
function needsSecondaryPortRow(
  ethCount: number,
  sfpCount: number,
  hasWifi: boolean,
  cardWidth: number,
): boolean {
  if (ethCount <= 0 || (sfpCount <= 0 && !hasWifi)) return false

  const ethBlockWidth = Math.min(ethCount, getEthernetPortsPerRow(cardWidth)) * ETH_PORT_SLOT_WIDTH
  const secondaryWidth =
    sfpCount * ETH_PORT_SLOT_WIDTH + (hasWifi ? WIFI_BLOCK_WIDTH + PORT_STRIP_ROW_GAP : 0)
  const usableWidth = cardWidth - ETH_STRIP_HORIZONTAL_PADDING

  return ethBlockWidth + PORT_STRIP_ROW_GAP + secondaryWidth > usableWidth
}

/**
 * Computes which port on each device each connection uses.
 *
 * Two-pass algorithm (Phase 2c):
 *   1. Pin pass — for connections that declare `fromPort` / `toPort`,
 *      resolve the label and pin the assignment to that
 *      `(interfaceType, index)`. The slot is marked as taken.
 *   2. Greedy pass — every remaining side (and connections without
 *      pinned ports) consumes the next free index per
 *      `(device, interfaceType)`, skipping any slot pinned in step 1.
 *
 * WiFi connections don't consume ports but are tracked for the client count.
 *
 * Resolution errors here are silent: the validator runs first and
 * reports them. If resolution still fails (e.g. the validator was
 * skipped), the side is left unpinned and falls through to greedy —
 * this is belt-and-braces, not a substitute for validation.
 */
function assignPorts(devices: Device[], connections: Connection[]): Map<string, PortAssignment[]> {
  const assignments = new Map<string, PortAssignment[]>()

  // Used slots per device: Set of `${ifaceType}:${index}`.
  const usedSlots = new Map<string, Set<string>>()

  // Label lookups per device for greedy-side label propagation.
  const labelLookups = new Map<string, Map<string, string>>()

  // Device lookup (children included) so resolvePortReference can
  // walk interfaces declared on nested devices.
  const deviceLookup = new Map<string, Device>()
  const collectDevices = (list: Device[]) => {
    for (const d of list) {
      deviceLookup.set(d.id, d)
      assignments.set(d.id, [])
      usedSlots.set(d.id, new Set())
      labelLookups.set(d.id, buildLabelLookup(d))
      if (d.children) collectDevices(d.children)
    }
  }
  collectDevices(devices)

  // Tracks which side of each connection has already been pinned in
  // pass 1, so pass 2 doesn't double-assign.
  interface SideState {
    fromPinned: boolean
    toPinned: boolean
  }
  const sideStates: SideState[] = connections.map(() => ({ fromPinned: false, toPinned: false }))

  // ── Pass 1: pin labelled references ─────────────────────────────
  connections.forEach((conn, i) => {
    if (conn.fromPort !== undefined) {
      const dev = deviceLookup.get(conn.from)
      if (dev) {
        const r = resolvePortReference(dev, conn.fromPort, conn.type)
        if ('interfaceType' in r) {
          pinAssignment(
            conn.from,
            conn.to,
            r.interfaceType,
            r.index,
            conn.speed,
            conn.bundle,
            assignments,
            usedSlots,
            labelLookups,
          )
          sideStates[i].fromPinned = true
        }
      }
    }
    if (conn.toPort !== undefined && conn.direction !== 'one-way') {
      const dev = deviceLookup.get(conn.to)
      if (dev) {
        const r = resolvePortReference(dev, conn.toPort, conn.type)
        if ('interfaceType' in r) {
          pinAssignment(
            conn.to,
            conn.from,
            r.interfaceType,
            r.index,
            conn.speed,
            conn.bundle,
            assignments,
            usedSlots,
            labelLookups,
          )
          sideStates[i].toPinned = true
        }
      }
    }
  })

  // ── Pass 2: greedy for remaining sides ──────────────────────────
  connections.forEach((conn, i) => {
    const connType = conn.type ?? 'ethernet'
    const isWifi = connType === 'wifi'
    const ifaceType: EnumerableInterfaceType = isWifi
      ? 'wifi'
      : connType === 'fiber' || connType === 'sfp'
        ? 'sfp'
        : connType === 'usb'
          ? 'usb'
          : connType === 'thunderbolt'
            ? 'thunderbolt'
            : 'ethernet'

    if (!sideStates[i].fromPinned) {
      if (!hasExplicitPortMap(deviceLookup.get(conn.from), ifaceType)) {
        greedyAssign(
          conn.from,
          conn.to,
          ifaceType,
          conn.speed,
          conn.bundle,
          assignments,
          usedSlots,
          labelLookups,
        )
      }
    }
    if (conn.direction !== 'one-way' && !sideStates[i].toPinned) {
      if (!hasExplicitPortMap(deviceLookup.get(conn.to), ifaceType)) {
        greedyAssign(
          conn.to,
          conn.from,
          ifaceType,
          conn.speed,
          conn.bundle,
          assignments,
          usedSlots,
          labelLookups,
        )
      }
    }
  })

  return assignments
}

/** Pins an assignment to a specific (interfaceType, index) slot. */
function pinAssignment(
  deviceId: string,
  connectedTo: string,
  ifaceType: EnumerableInterfaceType,
  portIndex: number,
  speed: string | undefined,
  bundle: string | undefined,
  assignments: Map<string, PortAssignment[]>,
  usedSlots: Map<string, Set<string>>,
  labelLookups: Map<string, Map<string, string>>,
): void {
  const deviceAssignments = assignments.get(deviceId)
  const used = usedSlots.get(deviceId)
  if (!deviceAssignments || !used) return

  const assignment: PortAssignment = {
    deviceId,
    interfaceType: ifaceType,
    portIndex,
    connectedTo,
  }
  if (speed !== undefined) assignment.speed = speed
  if (bundle !== undefined) assignment.bundle = bundle

  const label = labelLookups.get(deviceId)?.get(`${ifaceType}:${portIndex}`)
  if (label !== undefined) assignment.label = label

  deviceAssignments.push(assignment)
  used.add(`${ifaceType}:${portIndex}`)
}

/**
 * Whether a device has an author-declared port map for the given interface type.
 * Devices with explicit `ports[]` arrays should only have pinned assignments —
 * greedy auto-placement would silently claim a specific labelled port and
 * render it as active, indistinguishable from a deliberately wired port.
 */
function hasExplicitPortMap(
  device: Device | undefined,
  ifaceType: EnumerableInterfaceType,
): boolean {
  if (!device?.interfaces) return false
  if (ifaceType === 'wifi') return false
  const group = device.interfaces[ifaceType]
  return (group?.ports?.length ?? 0) > 0
}

/** Greedy: hands out the next free index for (device, ifaceType), skipping pinned slots. */
function greedyAssign(
  deviceId: string,
  connectedTo: string,
  ifaceType: EnumerableInterfaceType,
  speed: string | undefined,
  bundle: string | undefined,
  assignments: Map<string, PortAssignment[]>,
  usedSlots: Map<string, Set<string>>,
  labelLookups: Map<string, Map<string, string>>,
): void {
  const deviceAssignments = assignments.get(deviceId)
  const used = usedSlots.get(deviceId)
  if (!deviceAssignments || !used) return

  // Find next free index.
  let index = 0
  while (used.has(`${ifaceType}:${index}`)) index++

  const assignment: PortAssignment = {
    deviceId,
    interfaceType: ifaceType,
    portIndex: index,
    connectedTo,
  }
  if (speed !== undefined) assignment.speed = speed
  if (bundle !== undefined) assignment.bundle = bundle

  const label = labelLookups.get(deviceId)?.get(`${ifaceType}:${index}`)
  if (label !== undefined) assignment.label = label

  deviceAssignments.push(assignment)
  used.add(`${ifaceType}:${index}`)
}

function appendGroupPorts(
  out: EnumeratedPort[],
  type: Exclude<EnumerableInterfaceType, 'wifi'>,
  group: InterfaceGroup,
): void {
  for (let i = 0; i < group.count; i++) {
    const portDecl = group.ports?.[i]
    const port: EnumeratedPort = {
      interfaceType: type,
      index: i,
    }
    if (portDecl?.label !== undefined) port.label = portDecl.label

    const speed = portDecl?.speed ?? group.speed
    if (speed !== undefined) port.speed = speed

    out.push(port)
  }
}

/**
 * Enumerates every physical/logical port on a device in render order:
 * ethernet → sfp → usb → thunderbolt → wifi, ascending by index within
 * each group.
 *
 * WiFi is included for enumeration consistency even though it doesn't
 * occupy a socket; downstream consumers (e.g. PortStrip) decide how to
 * paint it.
 */
function enumeratePorts(device: Device): EnumeratedPort[] {
  const result: EnumeratedPort[] = []

  const ifaces = device.interfaces
  if (!ifaces) return result

  const socketTypes = ['ethernet', 'sfp', 'usb', 'thunderbolt'] as const
  for (const type of socketTypes) {
    const group = ifaces[type]
    if (!group) continue
    appendGroupPorts(result, type, group)
  }

  // WiFi: a single conceptual "port" if the interface exists.
  // No count to enumerate against — it's binary presence.
  if (ifaces.wifi) {
    result.push({ interfaceType: 'wifi', index: 0 })
  }

  return result
}

/**
 * Builds a `${type}:${index} → label` map for a device from its
 * enumerated ports. Anonymous ports are omitted (no label).
 */
function buildLabelLookup(device: Device): Map<string, string> {
  const map = new Map<string, string>()

  for (const port of enumeratePorts(device)) {
    if (port.label === undefined) continue
    map.set(`${port.interfaceType as EnumerableInterfaceType}:${port.index}`, port.label)
  }

  return map
}

/**
 * Computes the X position of a specific ethernet/SFP port relative to the card's left edge.
 * Used by both the layout engine (for edge routing) and the renderer (for port strip positioning).
 */
function getPortX(portIndex: number, _totalPorts: number, _cardWidth: number): number {
  const startX = PORT_STRIP_PADDING
  return startX + portIndex * (PORT_WIDTH + PORT_GAP) + PORT_WIDTH / 2
}

/**
 * Returns the Y offset of the port strip from the top of the card.
 * This must match the renderer's positioning.
 */
function getPortStripY(cardHeight: number): number {
  return cardHeight - 10
}

/**
 * Looks up the `InterfaceGroup` on a device for a given assignment's
 * interface type. Returns `undefined` for `'wifi'` (which maps to
 * `WifiInterface`, not an `InterfaceGroup`) and for any device that
 * doesn't declare that interface type.
 *
 * Used by the layout engine to read `count` when computing per-port
 * coordinates. Encapsulating the lookup here keeps the value-type
 * narrowing (InterfaceGroup vs WifiInterface) honest at call sites,
 * which previously relied on a `'count' in iface` runtime guard
 * paired with a cast that lied about value shape.
 */
function getInterfaceGroup(
  device: Device,
  type: PortAssignment['interfaceType'],
): InterfaceGroup | undefined {
  const ifaces = device.interfaces

  if (!ifaces) return undefined
  if (type === 'wifi') return undefined

  return ifaces[type]
}

function compatibleInterfaceType(connType: string): EnumerableInterfaceType | null {
  switch (connType) {
    case 'ethernet':
      return 'ethernet'
    case 'fiber':
    case 'sfp':
      return 'sfp'
    case 'wifi':
      return 'wifi'
    case 'usb':
      return 'usb'
    case 'thunderbolt':
      return 'thunderbolt'
    default:
      return null
  }
}

function resolvePortReference(device: Device, label: string, connType?: string): PortResolution {
  const ports = enumeratePorts(device)

  // When connType is given and recognized, filter to the compatible group.
  let constraint: EnumerableInterfaceType | null = null
  if (connType !== undefined) {
    constraint = compatibleInterfaceType(connType)
  }

  const matches = ports.filter((p) => {
    if (p.label !== label) return false
    if (constraint !== null && p.interfaceType !== constraint) return false
    return true
  })

  if (matches.length === 0) {
    // Distinguish "label exists but wrong type" from "label missing entirely".
    const labelExistsSomewhere = ports.some((p) => p.label === label)
    if (labelExistsSomewhere && constraint !== null) {
      const groups = ports.filter((p) => p.label === label).map((p) => p.interfaceType)
      return {
        error: `Port '${label}' exists on ${device.id} but not on a ${constraint}-compatible interface (found on ${groups.join(', ')}).`,
      }
    }
    return { error: `Port '${label}' does not exist on device '${device.id}'.` }
  }

  if (matches.length > 1) {
    const groups = Array.from(new Set(matches.map((m) => `${m.interfaceType}.${label}`))).join(
      ' and ',
    )
    return {
      error: `'${label}' is ambiguous (matches ${groups}); specify type:`,
    }
  }

  return { interfaceType: matches[0].interfaceType, index: matches[0].index }
}

export {
  PORT_DIMENSIONS,
  ETH_ROW_HEIGHT,
  EnumerableInterfaceType,
  EnumeratedPort,
  PortAssignment,
  PortLayout,
  PortResolution,
  assignPorts,
  enumeratePorts,
  getEthernetRowCount,
  getEthernetPortsPerRow,
  needsSecondaryPortRow,
  getPortX,
  getPortStripY,
  getInterfaceGroup,
  resolvePortReference,
}
