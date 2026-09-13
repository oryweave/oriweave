import React from 'react'
import { colors, fonts } from '../theme'

interface CanvasControlsProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onResetView: () => void
}

const buttonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(22, 27, 34, 0.9)',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  color: colors.textSecondary,
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  fontFamily: fonts.mono,
  fontSize: 14,
  padding: 0,
}

const Button: React.FC<{
  title: string
  children: React.ReactNode
  onClick: () => void
}> = ({ onClick, title, children }) => {
  const [hovered, setHovered] = React.useState(false)

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...buttonStyle,
        background: hovered ? 'rgba(38, 198, 218, 0.1)' : 'rgba(22, 27, 34, 0.9)',
        borderColor: hovered ? colors.primaryBorder : colors.border,
        color: hovered ? colors.primary : colors.textSecondary,
      }}
    >
      {children}
    </button>
  )
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onResetView,
  scale,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 10,
        pointerEvents: 'auto',
      }}
    >
      <Button onClick={onZoomIn} title="Zoom in">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </Button>

      <Button onClick={onZoomOut} title="Zoom out">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13H5v-2h14v2z" />
        </svg>
      </Button>

      {/* Scale indicator */}
      <div
        style={{
          width: 36,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonts.mono,
          fontSize: 9,
          color: colors.textMuted,
          letterSpacing: '0.02em',
          userSelect: 'none',
        }}
      >
        {Math.round(scale * 100)}%
      </div>

      <Button onClick={onFitToScreen} title="Fit to screen">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z" />
        </svg>
      </Button>

      <Button onClick={onResetView} title="Reset to 100%">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        </svg>
      </Button>
    </div>
  )
}
