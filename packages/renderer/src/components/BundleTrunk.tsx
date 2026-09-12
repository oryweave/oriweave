import React from 'react'
import { ConnectionLine } from './ConnectionLine'
import { connectionColors, colors } from '../theme'
import type { PositionedEdge } from '@oriweave/core'

interface BundleTrunkProps {
  edges: PositionedEdge[]
  highlightedKey?: string
  dimmed?: boolean
  keyFor: (edge: PositionedEdge) => string
}

const SPLAY_LENGTH = 20

/**
 * Renders a group of bundled connections as a single visual trunk.
 *
 * Geometry:
 *   - Each member edge has its own port-pinned `points[]` start and end.
 *   - The trunk centerline runs between the midpoint of all member
 *     starts and the midpoint of all member ends, with the last
 *     SPLAY_LENGTH pixels at each end fanned out to each member's
 *     actual port position.
 *
 * Styling:
 *   - Pure-type bundles (all members share `connection.type`) use that
 *     type's color (e.g. ethernet → green).
 *   - Mixed-type bundles use a neutral secondary color and the label
 *     is suffixed with the member type list.
 *
 * Hover behavior:
 *   - When a member edge is highlighted, the trunk dims and the
 *     highlighted member renders as a normal `ConnectionLine` on top,
 *     so the structural reality (this is N edges, not 1) shows
 *     through on interaction. Visual collapse is the at-rest state.
 */
export const BundleTrunk: React.FC<BundleTrunkProps> = ({
  edges,
  highlightedKey,
  dimmed,
  keyFor,
}) => {
  if (edges.length === 0) return null

  // ── Bundle styling: pure-type vs mixed-type ───────────────────────
  const memberTypes = Array.from(new Set(edges.map((e) => e.connection.type ?? 'ethernet')))
  const isMixed = memberTypes.length > 1
  const trunkColor = isMixed
    ? colors.textSecondary
    : (connectionColors[memberTypes[0]] ?? connectionColors.default)

  const bundleName = edges[0].bundle ?? ''
  const labelText = isMixed
    ? `${bundleName} · ${memberTypes.map((t) => abbreviateType(t)).join('+')}`
    : bundleName

  // ── Geometry ──────────────────────────────────────────────────────
  // Each member contributes a start (points[0]) and an end (last point).
  const memberStarts = edges.map((e) => e.points[0])
  const memberEnds = edges.map((e) => e.points[e.points.length - 1])

  const trunkStart = centroid(memberStarts)
  const trunkEnd = centroid(memberEnds)

  // Splay anchor points: SPLAY_LENGTH from each end along the trunk axis.
  // If the trunk is shorter than 2*SPLAY_LENGTH, fall back to thirds.
  const totalLen = Math.hypot(trunkEnd.x - trunkStart.x, trunkEnd.y - trunkStart.y)
  const splay = Math.min(SPLAY_LENGTH, totalLen / 3)
  const startAnchor = pointAlong(trunkStart, trunkEnd, splay)
  const endAnchor = pointAlong(trunkEnd, trunkStart, splay)

  const isHighlighted = highlightedKey !== undefined
  // When a member is highlighted, dim the trunk visuals so the
  // highlighted ConnectionLine reads cleanly on top.
  const trunkOpacity = isHighlighted ? 0.25 : dimmed ? 0.4 : 1

  const trunkPath = `M ${startAnchor.x} ${startAnchor.y} L ${endAnchor.x} ${endAnchor.y}`

  const highlightedEdge = isHighlighted
    ? edges.find((e) => keyFor(e) === highlightedKey)
    : undefined

  return (
    <g style={{ opacity: trunkOpacity, transition: 'opacity 0.2s' }}>
      {/* Trunk glow */}
      <path
        d={trunkPath}
        fill="none"
        stroke={trunkColor}
        strokeWidth={10}
        strokeOpacity={0.1}
        strokeLinecap="round"
      />
      {/* Trunk core */}
      <path
        d={trunkPath}
        fill="none"
        stroke={trunkColor}
        strokeWidth={4}
        strokeOpacity={0.7}
        strokeLinecap="round"
      />

      {/* Splay lines: anchor → each member's port position */}
      {memberStarts.map((p, i) => (
        <line
          key={`splay-start-${i}`}
          x1={startAnchor.x}
          y1={startAnchor.y}
          x2={p.x}
          y2={p.y}
          stroke={trunkColor}
          strokeWidth={1.5}
          strokeOpacity={0.5}
          strokeLinecap="round"
        />
      ))}
      {memberEnds.map((p, i) => (
        <line
          key={`splay-end-${i}`}
          x1={endAnchor.x}
          y1={endAnchor.y}
          x2={p.x}
          y2={p.y}
          stroke={trunkColor}
          strokeWidth={1.5}
          strokeOpacity={0.5}
          strokeLinecap="round"
        />
      ))}

      {/* Bundle label pill */}
      {bundleName &&
        (() => {
          const mid = {
            x: (trunkStart.x + trunkEnd.x) / 2,
            y: (trunkStart.y + trunkEnd.y) / 2,
          }
          const pillWidth = Math.max(36, labelText.length * 5 + 12)
          return (
            <g>
              <rect
                x={mid.x - pillWidth / 2}
                y={mid.y - 8}
                width={pillWidth}
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
                {labelText}
              </text>
            </g>
          )
        })()}

      {/* Structural reality on interaction: highlighted member renders on top. */}
      {highlightedEdge && (
        <g style={{ opacity: 1 / Math.max(trunkOpacity, 0.01) }}>
          <ConnectionLine edge={highlightedEdge} highlighted />
        </g>
      )}
    </g>
  )
}

// ─── Geometry helpers ─────────────────────────────────────────────

function centroid(points: { x: number; y: number }[]): { x: number; y: number } {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

/** Returns the point that is `distance` units from `from` along the line toward `to`. */
function pointAlong(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return { ...from }
  return { x: from.x + (dx / len) * distance, y: from.y + (dy / len) * distance }
}

function abbreviateType(type: string): string {
  switch (type) {
    case 'ethernet':
      return 'ETH'
    case 'sfp':
    case 'fiber':
      return 'SFP'
    case 'wifi':
      return 'WIFI'
    case 'usb':
      return 'USB'
    case 'thunderbolt':
      return 'TB'
    case 'vpn':
      return 'VPN'
    default:
      return type.toUpperCase()
  }
}
