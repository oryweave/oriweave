/**
 * Design tokens derived from the reference topology diagrams.
 * Both references share a dark-background + neon-accent aesthetic.
 */
export const colors = {
  // Canvas
  background: '#0D1117',
  backgroundSubtle: '#161B22',

  // Primary accent — cyan/teal
  primary: '#26C6DA',
  primaryDim: 'rgba(38, 198, 218, 0.15)',
  primaryBorder: 'rgba(38, 198, 218, 0.35)',

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
  border: 'rgba(38, 198, 218, 0.12)',
  borderHover: 'rgba(38, 198, 218, 0.35)',
} as const

export const connectionColors: Record<string, string> = {
  ethernet: colors.green,
  wifi: colors.primary,
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

/** Returns the accent color for a given device type. */
export function deviceAccent(type: string): string {
  switch (type) {
    case 'router':
    case 'firewall':
    case 'modem':
    case 'switch':
    case 'ap':
      return colors.primary
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
      return colors.primary
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
