import React from 'react'
import { colors, fonts, radii } from '../theme'
import { getDeviceIconPath } from '../icons'

interface NodePuckProps {
  type: string
  accent: string
  size?: number
  supernode?: boolean
  count?: number
}

/**
 * Small decorative device-type icon — used in card thumbnails (gallery/template previews),
 * not on the live canvas (that's `SupernodePuck`, which is positioned, labelled, and
 * interactive). Circular by default; `supernode` switches to a rounded square with a
 * bottom-right `×N` count badge, matching a collapsed-group puck's shape without borrowing
 * its canvas-only behavior.
 */
export const NodePuck: React.FC<NodePuckProps> = ({
  type,
  accent,
  size = 36,
  supernode,
  count,
}) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: supernode ? radii.sm : '50%',
      position: 'relative',
      background: `${accent}15`,
      border: `1.5px solid ${accent}66`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24" fill={accent}>
      <path d={getDeviceIconPath(type)} />
    </svg>
    {supernode && count !== undefined && (
      <span
        style={{
          position: 'absolute',
          bottom: -6,
          right: -6,
          background: colors.backgroundSubtle,
          border: `1px solid ${accent}66`,
          color: accent,
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.06em',
          padding: '1px 5px',
          borderRadius: radii.pill,
          fontFamily: fonts.mono,
          whiteSpace: 'nowrap',
        }}
      >
        ×{count}
      </span>
    )}
  </div>
)
