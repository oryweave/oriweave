import React from 'react'
import { connectionColors, colors } from '../theme'
import type { PositionedEdge } from '@oriweave/core'

interface ConnectionLineProps {
  edge: PositionedEdge
  highlighted?: boolean
  dimmed?: boolean
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({ edge, highlighted, dimmed }) => {
  const { connection, points } = edge
  if (points.length < 2) return null

  const connType = connection.type ?? 'default'
  const color = connectionColors[connType] ?? connectionColors.default
  const isVpn = connType === 'vpn'
  const isWifi = connType === 'wifi'

  // Build SVG path
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Compute total path length for animation
  const totalLength = points.reduce((sum, p, i) => {
    if (i === 0) return 0
    const prev = points[i - 1]
    return sum + Math.hypot(p.x - prev.x, p.y - prev.y)
  }, 0)

  // Animation speed: pixels per second
  const speed = 60
  const duration = Math.max(1, totalLength / speed)

  // Dash pattern for the animated "particle" layer
  const particleGap = 24
  const particleDot = 6

  return (
    <g>
      {/* Glow layer */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={highlighted ? 8 : 5}
        strokeOpacity={highlighted ? 0.15 : dimmed ? 0.02 : 0.06}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'stroke-opacity 0.18s, stroke-width 0.18s' }}
      />

      {/* Base line — static, subtle */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={highlighted ? 2 : 1}
        strokeOpacity={highlighted ? 0.5 : dimmed ? 0.08 : 0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isVpn ? '6 4' : isWifi ? '2 4' : 'none'}
        style={{ transition: 'stroke-opacity 0.18s, stroke-width 0.18s' }}
      />

      {/* Animated flow layer — marching dots */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={highlighted ? 3 : 2}
        strokeOpacity={highlighted ? 1 : dimmed ? 0.15 : 0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${particleDot} ${particleGap}`}
        style={{ transition: 'stroke-opacity 0.18s, stroke-width 0.18s' }}
      >
        <animate
          attributeName="stroke-dashoffset"
          from={`${particleDot + particleGap}`}
          to="0"
          dur={`${duration}s`}
          repeatCount="indefinite"
        />
      </path>

      {/* Endpoint dots */}
      <circle
        cx={points[0].x}
        cy={points[0].y}
        r={highlighted ? 3.5 : 2.5}
        fill={color}
        opacity={highlighted ? 0.8 : dimmed ? 0.15 : 0.4}
        style={{ transition: 'opacity 0.18s, r 0.18s' }}
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={highlighted ? 3.5 : 2.5}
        fill={color}
        opacity={highlighted ? 0.8 : dimmed ? 0.15 : 0.4}
        style={{ transition: 'opacity 0.18s, r 0.18s' }}
      />

      {/* Speed / label */}
      {(connection.speed || connection.label) &&
        points.length >= 2 &&
        (() => {
          const mid =
            points.length >= 4
              ? { x: (points[1].x + points[2].x) / 2, y: (points[1].y + points[2].y) / 2 }
              : { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
          return (
            <g>
              <rect
                x={mid.x - 18}
                y={mid.y - 8}
                width={36}
                height={14}
                rx={3}
                fill={colors.background}
                fillOpacity={0.85}
              />
              <text
                x={mid.x}
                y={mid.y + 3}
                textAnchor="middle"
                fill={colors.textMuted}
                fontSize={8}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={600}
              >
                {connection.label ?? connection.speed}
              </text>
            </g>
          )
        })()}
    </g>
  )
}
