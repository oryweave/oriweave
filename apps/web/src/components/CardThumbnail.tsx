import React from 'react'
import { colors, NodePuck } from '@oriweave/renderer'

interface CardThumbnailProps {
  accent: string
  height: number
  count?: number
  children?: React.ReactNode
}

// Browse-card preview: a dot-grid ground with a fixed switch/server/container puck row,
// the last carrying a real count badge when one exists (fork count today; template device
// counts aren't in the list-summary payload, so templates render the plain trio).
export const CardThumbnail: React.FC<CardThumbnailProps> = ({
  accent,
  height,
  count,
  children,
}) => (
  <div
    style={{
      position: 'relative',
      height,
      background: colors.backgroundDeep,
      borderBottom: `1px solid ${colors.border}`,
      overflow: 'hidden',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255, 152, 0, 0.10) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
      }}
    >
      <NodePuck type="switch" accent={accent} size={36} />
      <NodePuck type="server" accent={accent} size={36} />
      <NodePuck
        type="container"
        accent={accent}
        size={36}
        supernode={count !== undefined}
        count={count}
      />
    </div>
    {children}
  </div>
)
