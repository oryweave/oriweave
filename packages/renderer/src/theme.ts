/**
 * Design tokens derived from the reference topology diagrams.
 * Both references share a dark-background + neon-accent aesthetic.
 */
export const colors = {
  // Canvas
  background: '#0D1117',
  backgroundSubtle: '#161B22',
  backgroundDeep: '#080B0F', // code/YAML surfaces

  // Primary accent — amber/orange. UI chrome only: the topology canvas's own
  // device-tier and link-type color coding stays on the old teal — see
  // networkAccent below — so this change doesn't collide compute- and
  // networking-tier devices into the same diagram color.
  primary: '#FF9800',
  primaryLight: '#FFB74D',
  primaryDeep: '#E65100',
  primaryDim: 'rgba(255, 152, 0, 0.15)',
  primaryBorder: 'rgba(255, 152, 0, 0.35)',

  // The former primary teal, preserved under its own name for the canvas's
  // networking-tier device accent and wifi link color (deviceAccent(),
  // connectionColors.wifi) — kept stable independent of the UI accent above.
  networkAccent: '#26C6DA',

  // Secondary accents
  amber: '#FF9800',
  amberLight: '#FFB74D',
  amberDim: 'rgba(255, 152, 0, 0.15)',
  amberBorder: 'rgba(255, 152, 0, 0.35)',

  green: '#00e676',
  greenDim: 'rgba(0, 230, 118, 0.15)',

  red: '#ff1744',
  redDim: 'rgba(255, 23, 68, 0.15)',

  purple: '#d500f9',
  purpleDim: 'rgba(213, 0, 249, 0.15)',

  // Text
  textPrimary: '#E0E0E0',
  textSecondary: '#8B949E',
  textMuted: '#6E7681',

  // Borders
  border: 'rgba(255, 152, 0, 0.12)',
  borderHover: 'rgba(255, 152, 0, 0.35)',
  borderActive: 'rgba(255, 152, 0, 0.6)',
} as const

export const connectionColors: Record<string, string> = {
  ethernet: colors.green,
  wifi: colors.networkAccent,
  vpn: colors.amber,
  usb: colors.purple,
  thunderbolt: colors.purple,
  fiber: colors.green,
  default: colors.textSecondary,
}

export const fonts = {
  mono: "'Fira Code', 'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace",
  sans: "'Fira Sans', 'IBM Plex Sans', 'Inter', system-ui, sans-serif",
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
} as const

/** Transition durations. 120/180/320ms — short and mechanical, no bounce. */
export const motion = {
  fast: '0.12s',
  base: '0.18s',
  slow: '0.32s',
} as const

export const radii = {
  xs: 3, // tags
  sm: 4,
  md: 6, // cards
  lg: 8, // panels, page frames
  pill: 999,
} as const

export const glow = {
  sm: 6,
  md: 12,
} as const

/** The one shadow in the system: the accent glow on a selected/highlighted card. */
export function selectedGlow(accentColor: string): string {
  return `0 0 ${glow.md * 2}px ${accentColor}33`
}

/** Returns the accent color for a given device type. */
export function deviceAccent(type: string): string {
  switch (type) {
    case 'router':
    case 'firewall':
    case 'modem':
    case 'switch':
    case 'ap':
      return colors.networkAccent
    case 'server':
    case 'hypervisor':
    case 'nas':
    case 'mini-pc':
    case 'sbc':
      return colors.amber
    case 'vm':
    case 'container':
      return colors.green
    case 'camera':
    case 'iot':
    case 'printer':
      return colors.red
    case 'desktop':
    case 'laptop':
      return colors.networkAccent
    case 'phone':
    case 'tablet':
    case 'tv':
    case 'game-console':
    case 'media-player':
      return colors.purple
    case 'vpn':
      return colors.amber
    default:
      return colors.textSecondary
  }
}
