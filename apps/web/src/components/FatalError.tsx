import React from 'react'
import { colors, fonts, radii } from '@oriweave/renderer'

interface FatalErrorProps {
  source: string
  status: number | null
  onRetry: () => void
}

export const FatalError: React.FC<FatalErrorProps> = ({ source, status, onRetry }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'rgba(255, 23, 68, 0.08)',
        border: '1px solid rgba(255, 23, 68, 0.35)',
        borderRadius: radii.sm,
        fontFamily: fonts.mono,
        fontSize: 12,
        color: colors.red,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700 }}>[fatal]</span> could not reach{' '}
        <span style={{ color: colors.textPrimary }}>{source}</span>{' '}
        <span style={{ color: 'rgba(255, 23, 68, 0.7)' }}>({status ?? 'network'})</span>
      </span>
      <button
        onClick={onRetry}
        style={{
          padding: '4px 10px',
          background: 'transparent',
          border: '1px solid rgba(255, 23, 68, 0.5)',
          borderRadius: radii.xs,
          color: colors.red,
          fontFamily: 'inherit',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 23, 68, 0.12)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        RETRY NOW
      </button>
    </div>
  )
}
