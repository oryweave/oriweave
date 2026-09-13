import React, { useState } from 'react'
import { colors, fonts } from '../theme'
import { getDeviceIconPath } from '../icons'

interface SupernodePuckProps {
  centreX: number
  centreY: number
  label: string
  count: number
  representativeType: string
  accentColor: string
  dimmed?: boolean
  focused?: boolean
  onExpand: () => void
}

const PUCK_SIZE = 60

/**
 * Visual stand-in for a collapsed group.
 *
 * Per the handoff spec (§ Spec — group collapse):
 *   - 60×60, `borderRadius: 6` (square-ish, distinct from the round
 *     puck used at <25% zoom for individual devices).
 *   - Background `${color}15`, border `1.5px solid ${color}66`.
 *   - Representative type icon (see `resolveSupernodeIcon`).
 *   - Label rendered directly below the puck.
 *   - `×N` badge bottom-right.
 *
 * Clicking the puck (or the badge) expands the group again.
 */
export const SupernodePuck: React.FC<SupernodePuckProps> = ({
  centreX,
  centreY,
  label,
  count,
  representativeType,
  accentColor,
  onExpand,
  dimmed,
  focused,
}) => {
  const [hovered, setHovered] = useState(false)

  const outerOpacity = dimmed ? 0.18 : 1

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onExpand()
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: centreX - PUCK_SIZE / 2,
        top: centreY - PUCK_SIZE / 2,
        width: PUCK_SIZE,
        height: PUCK_SIZE + 18,
        cursor: 'pointer',
        opacity: outerOpacity,
        transition: 'opacity 0.18s',
        fontFamily: fonts.mono,
        userSelect: 'none',
      }}
      title={`${label} · expand`}
    >
      {/* Puck body */}
      <div
        style={{
          width: PUCK_SIZE,
          height: PUCK_SIZE,
          borderRadius: 6,
          background: `${accentColor}15`,
          border: `1.5px solid ${hovered ? accentColor : `${accentColor}66`}`,
          outline: focused ? `1.5px solid ${colors.primary}` : 'none',
          outlineOffset: focused ? 4 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: hovered ? `0 0 16px ${accentColor}33` : 'none',
          transition: 'border-color 0.12s, box-shadow 0.12s',
        }}
      >
        <svg width={28} height={28} viewBox="0 0 24 24" fill={accentColor}>
          <path d={getDeviceIconPath(representativeType)} />
        </svg>

        {/* Count badge (bottom-right) */}
        <div
          style={{
            position: 'absolute',
            right: -6,
            bottom: -6,
            background: colors.backgroundSubtle,
            border: `1px solid ${accentColor}88`,
            color: accentColor,
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.04em',
            fontFamily: fonts.mono,
            whiteSpace: 'nowrap',
          }}
        >
          ×{count}
        </div>
      </div>

      {/* Label */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 10,
          color: colors.textPrimary,
          marginTop: 4,
          whiteSpace: 'nowrap',
          overflow: 'visible',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  )
}
