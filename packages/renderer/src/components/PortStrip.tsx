import React, { useState } from 'react'
import { colors, fonts } from '../theme'
import type { DeviceInterfaces } from '@oriweave/core'
import type { PortAssignment, EnumeratedPort } from '@oriweave/core'
import { getEthernetPortsPerRow, needsSecondaryPortRow } from '@oriweave/core'

interface PortStripProps {
  interfaces: DeviceInterfaces
  assignments: PortAssignment[]
  cardWidth: number
  portEnumeration?: EnumeratedPort[]
  onPortHover?: (connectedTo: string | null) => void
}

const PORT_W = 18
const PORT_H = 16
const PORT_GAP = 3
const LABEL_MAX_CHARS = 4

function truncateLabel(label: string): string {
  if (label.length <= LABEL_MAX_CHARS) return label
  return `${label.slice(0, LABEL_MAX_CHARS - 1)}…`
}

const RJ45Port: React.FC<{
  active: boolean
  connectedTo?: string
  speed?: string
  index: number
  label?: string
  onHover?: (connectedTo: string | null) => void
}> = ({ active, connectedTo, speed, index, label, onHover }) => {
  const [hovered, setHovered] = useState(false)
  const activeColor = colors.green

  const handleEnter = () => {
    setHovered(true)
    if (active && connectedTo && onHover) onHover(connectedTo)
  }

  const handleLeave = () => {
    setHovered(false)
    if (onHover) onHover(null)
  }

  const captionText = label !== undefined ? truncateLabel(label) : String(index + 1)

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative', cursor: active ? 'pointer' : 'default' }}
    >
      <svg
        width={PORT_W}
        height={PORT_H}
        viewBox="0 0 18 16"
        style={{
          filter: hovered && active ? `drop-shadow(0 0 6px ${activeColor})` : 'none',
          transition: 'filter 0.12s',
        }}
      >
        {/* RJ45 housing */}
        <rect
          x={1}
          y={4}
          width={16}
          height={11}
          rx={1.5}
          fill={active ? `${activeColor}20` : '#1a2332'}
          stroke={active ? (hovered ? activeColor : `${activeColor}66`) : 'rgba(255,152,0,0.08)'}
          strokeWidth={hovered && active ? 1.5 : 1}
        />
        {/* Top clip/latch */}
        <rect
          x={5}
          y={1}
          width={8}
          height={4}
          rx={1}
          fill={active ? `${activeColor}30` : '#1a2332'}
          stroke={active ? `${activeColor}44` : 'rgba(255,152,0,0.06)'}
          strokeWidth={0.75}
        />
        {/* Latch notch */}
        <rect
          x={7}
          y={0}
          width={4}
          height={2}
          rx={0.5}
          fill={active ? `${activeColor}40` : '#151e2d'}
          stroke="none"
        />
        {/* Pin contacts (4 pins) */}
        {[5, 7.5, 10, 12.5].map((px, i) => (
          <rect
            key={i}
            x={px}
            y={6}
            width={1}
            height={4}
            rx={0.25}
            fill={active ? `${activeColor}60` : 'rgba(255,152,0,0.06)'}
          />
        ))}
        {/* Active LED indicator */}
        {active && (
          <>
            <circle cx={9} cy={12} r={1.5} fill={activeColor} opacity={hovered ? 1 : 0.7} />
            {hovered && <circle cx={9} cy={12} r={3} fill={activeColor} opacity={0.15} />}
          </>
        )}
      </svg>

      {/* Caption: user label when declared, else numeric port index.
        Per Phase 2b spec: active labels use the active color (green),
        inactive use textMuted; rendered below the socket. */}
      <div
        style={{
          textAlign: 'center',
          fontSize: label !== undefined ? 7 : 6,
          color: active
            ? label !== undefined
              ? activeColor
              : colors.textSecondary
            : colors.textMuted,
          marginTop: 1,
          fontFamily: fonts.mono,
          textTransform: label !== undefined ? 'uppercase' : 'none',
          letterSpacing: label !== undefined ? '0.04em' : 'normal',
        }}
      >
        {captionText}
      </div>

      {/* Tooltip — rendered below the port to avoid clipping.
        When the label was truncated, show the full label here. */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: PORT_H + 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0a1020',
            border: `1px solid ${active ? `${activeColor}55` : colors.border}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 10,
            color: active ? colors.textPrimary : colors.textMuted,
            whiteSpace: 'nowrap',
            zIndex: 200,
            fontFamily: fonts.mono,
            pointerEvents: 'none',
            boxShadow: active ? `0 0 12px ${activeColor}22` : 'none',
          }}
        >
          {(() => {
            const portName = label !== undefined ? label : `Port ${index + 1}`
            return active
              ? `${portName} → ${connectedTo}${speed ? ` (${speed})` : ''}`
              : `${portName} · Empty`
          })()}
        </div>
      )}
    </div>
  )
}

const WifiIndicator: React.FC<{
  clientCount: number
  bands?: string[]
  assignments: PortAssignment[]
  onHover?: (connectedTo: string | null) => void
}> = ({ clientCount, bands, assignments, onHover }) => {
  const [hovered, setHovered] = useState(false)
  const active = clientCount > 0

  const handleEnter = () => {
    setHovered(true)
    // Highlight all wifi connections
    if (active && onHover && assignments.length > 0) {
      onHover(assignments[0].connectedTo)
    }
  }

  const handleLeave = () => {
    setHovered(false)
    if (onHover) onHover(null)
  }

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        position: 'relative',
        cursor: active ? 'pointer' : 'default',
      }}
    >
      <svg
        width={18}
        height={16}
        viewBox="0 0 24 24"
        fill={active ? colors.primary : colors.textMuted}
        style={{
          opacity: active ? (hovered ? 1 : 0.8) : 0.3,
          filter: hovered && active ? `drop-shadow(0 0 6px ${colors.primary})` : 'none',
          transition: 'filter 0.12s, opacity 0.12s',
        }}
      >
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
      </svg>
      {active && (
        <span
          style={{
            fontSize: 9,
            color: hovered ? colors.primary : `${colors.primary}bb`,
            fontWeight: 600,
            fontFamily: fonts.mono,
            transition: 'color 0.12s',
          }}
        >
          {clientCount}
        </span>
      )}

      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0a1020',
            border: `1px solid ${colors.primary}44`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 10,
            color: colors.textPrimary,
            whiteSpace: 'nowrap',
            zIndex: 200,
            fontFamily: fonts.mono,
            pointerEvents: 'none',
            boxShadow: `0 0 12px ${colors.primary}22`,
          }}
        >
          <div>
            WiFi · {clientCount} client{clientCount !== 1 ? 's' : ''}
          </div>
          {bands && bands.length > 0 && (
            <div style={{ color: colors.textMuted, fontSize: 9 }}>{bands.join(' / ')}</div>
          )}
          {assignments.length > 0 && (
            <div style={{ marginTop: 2, borderTop: `1px solid ${colors.border}`, paddingTop: 2 }}>
              {assignments.map((a, i) => (
                <div key={i} style={{ fontSize: 9, color: colors.textSecondary }}>
                  → {a.connectedTo}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const PortStrip: React.FC<PortStripProps> = ({
  interfaces,
  assignments,
  cardWidth,
  onPortHover,
  portEnumeration,
}) => {
  const ethCount = interfaces.ethernet?.count ?? 0
  const sfpCount = interfaces.sfp?.count ?? 0
  const hasWifi = !!interfaces.wifi

  const ethAssignments = assignments.filter((a) => a.interfaceType === 'ethernet')
  const sfpAssignments = assignments.filter((a) => a.interfaceType === 'sfp')
  const wifiAssignments = assignments.filter((a) => a.interfaceType === 'wifi')

  if (ethCount === 0 && sfpCount === 0 && !hasWifi) return null

  // Build a `${type}:${index} → label` lookup so each socket can pick
  // up its declared label without iterating the enumeration array
  // multiple times. Absent for anonymous ports and for callers that
  // didn't supply an enumeration (backwards compat).
  const labelLookup = new Map<string, string>()
  if (portEnumeration) {
    for (const p of portEnumeration) {
      if (p.label !== undefined) labelLookup.set(`${p.interfaceType}:${p.index}`, p.label)
    }
  }

  // When any port on this device carries a user label, declared order
  // is load-bearing — `ports[0]` (e.g. WAN) MUST be the leftmost
  // socket regardless of whether it's currently active. The existing
  // active-first sort is preserved when there are no labels so anonymous
  // strips with many idle ports stay readable.
  // (Only ethernet renders with an active-first sort; SFP always
  // renders in index order, so it doesn't need a similar flag.)
  const ethHasLabels = Array.from(labelLookup.keys()).some((k) => k.startsWith('ethernet:'))

  // When ethernet's own row is wide (many ports), there may be no room
  // left for SFP/WiFi beside it — they drop to a row of their own instead
  // of overflowing the card. `needsSecondaryPortRow` is the same
  // computation the layout engine uses to reserve height for that row, so
  // the two can't disagree about whether it happens.
  const secondaryOnOwnRow = needsSecondaryPortRow(ethCount, sfpCount, hasWifi, cardWidth)

  const ethernetBlock =
    ethCount > 0 &&
    (() => {
      const maxPerRow = getEthernetPortsPerRow(cardWidth)
      const maxRows = 2
      const maxVisible = maxPerRow * maxRows

      // When labels exist, declared order is load-bearing — render
      // in index order so ports[0] (e.g. WAN) stays leftmost.
      // Otherwise, the existing active-first sort improves the
      // density of idle anonymous strips.
      const allPorts = Array.from({ length: ethCount }, (_, i) => {
        const assignment = ethAssignments.find((a) => a.portIndex === i)
        return { index: i, assignment }
      })

      const sorted = ethHasLabels
        ? allPorts
        : [...allPorts.filter((p) => p.assignment), ...allPorts.filter((p) => !p.assignment)]
      const visible = sorted.slice(0, maxVisible)
      const hiddenCount = sorted.length - visible.length

      // Split into rows
      const rows: (typeof visible)[] = []
      for (let i = 0; i < visible.length; i += maxPerRow) {
        rows.push(visible.slice(i, i + maxPerRow))
      }

      return (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: PORT_GAP, alignItems: 'flex-start' }}>
                {row.map((p) => (
                  <RJ45Port
                    key={`eth-${p.index}`}
                    index={p.index}
                    active={!!p.assignment}
                    connectedTo={p.assignment?.connectedTo}
                    speed={p.assignment?.speed}
                    label={labelLookup.get(`ethernet:${p.index}`)}
                    onHover={onPortHover}
                  />
                ))}
                {/* Overflow badge on the last row */}
                {ri === rows.length - 1 && hiddenCount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: PORT_H,
                      paddingLeft: 4,
                      fontSize: 8,
                      color: colors.textMuted,
                      fontFamily: fonts.mono,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{hiddenCount}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 7,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 2,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span>
              {interfaces.ethernet?.speed ? `${interfaces.ethernet.speed} ETH` : 'ETHERNET'}
            </span>
            <span style={{ color: colors.textMuted, opacity: 0.5 }}>
              {ethAssignments.length}/{ethCount} active
            </span>
          </div>
        </div>
      )
    })()

  const sfpBlock = sfpCount > 0 && (
    <div>
      <div style={{ display: 'flex', gap: PORT_GAP }}>
        {Array.from({ length: sfpCount }, (_, i) => {
          const assignment = sfpAssignments.find((a) => a.portIndex === i)
          return (
            <RJ45Port
              key={`sfp-${i}`}
              index={i}
              active={!!assignment}
              connectedTo={assignment?.connectedTo}
              speed={assignment?.speed}
              label={labelLookup.get(`sfp:${i}`)}
              onHover={onPortHover}
            />
          )
        })}
      </div>
      <div
        style={{
          fontSize: 7,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: 2,
        }}
      >
        {interfaces.sfp?.speed ? `${interfaces.sfp.speed} SFP` : 'SFP'}
      </div>
    </div>
  )

  const wifiBlock = hasWifi && (
    <div>
      <WifiIndicator
        clientCount={wifiAssignments.length}
        bands={interfaces.wifi?.bands}
        assignments={wifiAssignments}
        onHover={onPortHover}
      />
      <div
        style={{
          fontSize: 7,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: 2,
        }}
      >
        WIFI
      </div>
    </div>
  )

  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 14 }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingTop: 5,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <div style={rowStyle}>
        {ethernetBlock}
        {!secondaryOnOwnRow && sfpBlock}
        {!secondaryOnOwnRow && wifiBlock}
      </div>
      {secondaryOnOwnRow && (
        <div style={rowStyle}>
          {sfpBlock}
          {wifiBlock}
        </div>
      )}
    </div>
  )
}
