export interface HomelabDocument {
  meta: MetaConfig
  networks?: Network[]
  groups?: Group[]
  devices: Device[]
  connections: Connection[]
}

export interface MetaConfig {
  title: string
  subtitle?: string
  author?: string
  date?: string
  tags?: string[]
}

export interface Network {
  id: string
  name: string
  subnet?: string
  dhcp?: DhcpRange
  vlan?: number
}

export interface DhcpRange {
  start: string
  end: string
}

export interface Group {
  id: string
  name: string
  style?: 'dashed' | 'solid' | 'none'
  color?: string
  parent?: string
  /**
   * Set on groups synthesized by the layout engine's auto-clustering pass
   * (see `layout.ts`) for a large fan-out the author didn't group
   * themselves — never present on an author-declared group from the YAML.
   * The renderer uses this to start such groups collapsed by default.
   */
  synthetic?: boolean
}

export interface Device {
  id: string
  name: string
  type: DeviceType | string
  ip?: string
  network?: string
  group?: string
  tags?: string[]
  specs?: DeviceSpecs
  metadata?: Record<string, string>
  children?: Device[]
  services?: Service[]
  interfaces?: DeviceInterfaces
}

export type DeviceType =
  | 'router'
  | 'switch'
  | 'firewall'
  | 'server'
  | 'hypervisor'
  | 'vm'
  | 'container'
  | 'nas'
  | 'desktop'
  | 'laptop'
  | 'phone'
  | 'tablet'
  | 'camera'
  | 'tv'
  | 'iot'
  | 'ap'
  | 'modem'
  | 'vpn'
  | 'mini-pc'
  | 'sbc'
  | 'printer'
  | 'game-console'
  | 'media-player'

// Runtime-accessible mirror of DeviceType, for consumers (e.g. editor
// autocomplete) that need the value list, not just the compile-time type.
export const DEVICE_TYPES = [
  'router',
  'switch',
  'firewall',
  'server',
  'hypervisor',
  'vm',
  'container',
  'nas',
  'desktop',
  'laptop',
  'phone',
  'tablet',
  'camera',
  'tv',
  'iot',
  'ap',
  'modem',
  'vpn',
  'mini-pc',
  'sbc',
  'printer',
  'game-console',
  'media-player',
] as const satisfies readonly DeviceType[]

export interface DeviceSpecs {
  cpu?: string
  ram?: string
  storage?: string
  gpu?: string
  os?: string
}

export interface DeviceInterfaces {
  ethernet?: InterfaceGroup
  wifi?: WifiInterface
  sfp?: InterfaceGroup
  usb?: InterfaceGroup
  thunderbolt?: InterfaceGroup
}

export interface InterfaceGroup {
  count: number
  speed?: string
  ports?: Port[]
}

/**
 * A user-declared, identifiable port on a device interface group.
 * The position of a Port within its `ports[]` array determines which
 * physical socket it labels (index 0 = leftmost).
 */
export interface Port {
  label: string
  speed?: string
}

export interface WifiInterface {
  bands?: string[]
  standard?: string
}

export interface Service {
  name: string
  port?: number
  runtime?: 'native' | 'docker' | 'podman' | string
  url?: string
  metadata?: Record<string, string>
}

export interface Connection {
  from: string
  to: string
  type?: ConnectionType | string
  speed?: string
  direction?: 'one-way' | 'bidirectional'
  label?: string
  fromPort?: string
  toPort?: string
  bundle?: string
}

export type ConnectionType = 'ethernet' | 'wifi' | 'vpn' | 'usb' | 'thunderbolt' | 'fiber'

// Runtime-accessible mirror of ConnectionType — see DEVICE_TYPES above.
export const CONNECTION_TYPES = [
  'ethernet',
  'wifi',
  'vpn',
  'usb',
  'thunderbolt',
  'fiber',
] as const satisfies readonly ConnectionType[]

/* ─── Layout Output Types ──────────────────────────────────────────
 *
 * Produced by the layout engine, consumed by the renderer.
 */

export interface PositionedGraph {
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  groups: PositionedGroup[]
  bounds: Bounds
  meta: MetaConfig
  portAssignments: Map<string, import('./ports').PortAssignment[]>
  portEnumerations: Map<string, import('./ports').EnumeratedPort[]>
}

export interface PositionedNode {
  device: Device
  x: number
  y: number
  width: number
  height: number
  depth: number
}

export interface PositionedEdge {
  connection: Connection
  points: Point[]
  fromNodeId: string
  toNodeId: string
  fromPortIndex?: number
  toPortIndex?: number
  bundle?: string
}

export interface PositionedGroup {
  group: Group
  x: number
  y: number
  width: number
  height: number
  depth?: number
}

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  width: number
  height: number
}

/* ─── Validation ─────────────────────────────────────────────────── */

export interface ValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

/* ─── Layout Configuration ───────────────────────────────────────── */

export interface LayoutOptions {
  nodeWidth?: number
  nodeHeight?: number
  horizontalSpacing?: number
  verticalSpacing?: number
  groupPadding?: number
  /**
   * Total top-level device count below which the auto-clustering pass is a
   * complete no-op — small graphs render exactly as before this feature.
   */
  autoClusterMinGraphSize?: number
  /**
   * Minimum number of ungrouped, leaf, sibling devices fanning out from the
   * same parent before they're synthesized into a collapsed auto-cluster.
   */
  autoClusterFanoutThreshold?: number
}

export const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 300,
  nodeHeight: 160,
  horizontalSpacing: 50,
  verticalSpacing: 80,
  groupPadding: 40,
  autoClusterMinGraphSize: 25,
  autoClusterFanoutThreshold: 6,
}
