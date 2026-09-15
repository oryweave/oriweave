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
  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
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
        background: hovered ? 'rgba(255, 152, 0, 0.1)' : 'rgba(22, 27, 34, 0.9)',
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
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
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
          <path d="M9 21H3v-6h2v4h4v2zm12-12V3h-6v2h4v4h2zM5 9V5h4V3H3v6h2zm10 12v-2h4v-4h2v6h-6z" />
        </svg>
      </Button>

      <Button onClick={onResetView} title="Reset to 100%">
        {/* The design's own `ui.reset` path is truncated (its second subpath runs to negative
            x, off a 24-wide viewBox) — using the standard Material "refresh" glyph it's clearly
            derived from instead of reproducing that defect. */}
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
        </svg>
      </Button>
    </div>
  )
}
