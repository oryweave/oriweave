import React, { useState } from 'react'
import { colors, fonts, deviceAccent } from '../theme'
import { getDeviceIconPath, getSpecIconPath } from '../icons'
import { PortStrip } from './PortStrip'
import { ServiceIcon } from './ServiceIcon'
import type { PositionedNode, Device, PortAssignment, EnumeratedPort } from '@oriweave/core'

interface DeviceCardProps {
  node: PositionedNode
  originalDevice: Device
  portAssignments: PortAssignment[]
  portEnumeration?: EnumeratedPort[]
  dimmed?: boolean
  focused?: boolean
  zoomScale?: number
  showLabel?: boolean
  onChildClick: (child: Device, parent: Device) => void
  onPortHover?: (deviceId: string, connectedTo: string | null) => void
  onSelect?: (deviceId: string) => void
  onOpenDetail?: (device: Device, parent: Device | null) => void
}

const SpecItem: React.FC<{ specKey: string; value: string }> = ({ specKey, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: colors.textSecondary }}>
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill={colors.textMuted}
      style={{ flexShrink: 0 }}
    >
      <path d={getSpecIconPath(specKey)} />
    </svg>
    <span style={{ fontSize: 10, color: colors.textPrimary, whiteSpace: 'nowrap' }}>{value}</span>
  </div>
)

const Tag: React.FC<{ label: string; accent: string }> = ({ label, accent }) => (
  <span
    style={{
      fontSize: 8,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: accent,
      background: `${accent}18`,
      border: `1px solid ${accent}33`,
      borderRadius: 3,
      padding: '1px 6px',
      lineHeight: '16px',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </span>
)

const ChildCircle: React.FC<{
  child: Device
  onClick: () => void
}> = ({ child, onClick }) => {
  const [hovered, setHovered] = useState(false)
  const accent = deviceAccent(child.type)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={{
        position: 'relative',
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: `${accent}15`,
        border: `1.5px solid ${hovered ? accent : `${accent}44`}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hovered ? `0 0 12px ${accent}33` : 'none',
        flexShrink: 0,
      }}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill={accent}>
        <path d={getDeviceIconPath(child.type)} />
      </svg>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            bottom: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            background: colors.backgroundSubtle,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 9,
            color: colors.textPrimary,
            whiteSpace: 'nowrap',
            zIndex: 100,
            fontFamily: fonts.mono,
            pointerEvents: 'none',
          }}
        >
          {child.name}
        </div>
      )}
    </div>
  )
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  node,
  originalDevice,
  onChildClick,
  portAssignments,
  portEnumeration,
  onPortHover,
  dimmed,
  focused,
  zoomScale = 1,
  showLabel = true,
  onSelect,
  onOpenDetail,
}) => {
  const [hovered, setHovered] = useState(false)
  const { device, x, y, width, height } = node
  const accent = deviceAccent(device.type)

  const specs = originalDevice.specs
    ? Object.entries(originalDevice.specs).filter(([, v]) => v)
    : []
  const tags = originalDevice.tags ?? []
  const children = originalDevice.children ?? []

  const hideDetails = zoomScale < 0.75
  const renderAsPuck = zoomScale < 0.25
  const labelHidden = renderAsPuck || !showLabel

  const opacity = dimmed ? 0.18 : 1

  // ── Puck mode (< 25% zoom) ──────────────────────────────────────
  // The card collapses to a small circular puck centred on the card's
  // centre.
  if (renderAsPuck) {
    const PUCK = 24
    return (
      <div
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.(device.id)
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onOpenDetail?.(originalDevice, null)
        }}
        style={{
          position: 'absolute',
          left: x + width / 2 - PUCK / 2,
          top: y + height / 2 - PUCK / 2,
          width: PUCK,
          height: PUCK,
          borderRadius: '50%',
          background: `${accent}25`,
          border: `1.5px solid ${focused ? colors.primary : `${accent}66`}`,
          outline: focused ? `1.5px solid ${colors.primary}` : 'none',
          outlineOffset: focused ? 3 : 0,
          opacity,
          cursor: onSelect ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.2s, border-color 0.2s',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill={accent}>
          <path d={getDeviceIconPath(device.type)} />
        </svg>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(device.id)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpenDetail?.(originalDevice, null)
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        minHeight: height,
        background: colors.backgroundSubtle,
        borderRadius: 6,
        overflow: 'visible',
        border: `1px solid ${focused ? colors.primary : hovered ? accent : colors.border}`,
        outline: focused ? `1.5px solid ${colors.primary}` : 'none',
        outlineOffset: focused ? 4 : 0,
        fontFamily: fonts.mono,
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'border-color 0.2s, box-shadow 0.2s, opacity 0.2s',
        boxShadow: hovered ? `0 0 24px ${accent}22` : 'none',
        opacity,
        display: 'flex',
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          width: 3,
          flexShrink: 0,
          background: accent,
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.2s',
        }}
      />

      <div
        style={{
          flex: 1,
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 0,
        }}
      >
        {/* Header: icon + name + IP + type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill={accent} style={{ flexShrink: 0 }}>
            <path d={getDeviceIconPath(device.type)} />
          </svg>
          {!labelHidden && (
            <span
              style={{
                color: colors.textPrimary,
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {device.name}
            </span>
          )}
          {device.ip && !labelHidden && (
            <span style={{ color: colors.textMuted, fontSize: 10, whiteSpace: 'nowrap' }}>
              {device.ip}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <Tag label={device.type.toUpperCase()} accent={accent} />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map((t) => (
              <Tag key={t} label={t} accent={accent} />
            ))}
          </div>
        )}

        {/* Specs — icon + value pairs. Hidden at <75% zoom (Phase 2d LOD). */}
        {specs.length > 0 && !hideDetails && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px' }}>
            {specs.map(([key, value]) => (
              <SpecItem key={key} specKey={key} value={value as string} />
            ))}
          </div>
        )}

        {/* Port strip — hidden at <75% zoom (Phase 2d LOD). */}
        {originalDevice.interfaces && !hideDetails && (
          <PortStrip
            interfaces={originalDevice.interfaces}
            assignments={portAssignments}
            cardWidth={width}
            portEnumeration={portEnumeration}
            onPortHover={(connectedTo) => onPortHover?.(device.id, connectedTo)}
          />
        )}

        {/* Services — shown for devices with direct services */}
        {originalDevice.services && originalDevice.services.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingTop: 5,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <span
              style={{
                fontSize: 8,
                color: colors.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {originalDevice.services.length}
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {originalDevice.services.map((svc) => (
                <div
                  key={svc.name}
                  title={`${svc.name}${svc.port ? ` :${svc.port}` : ''}${svc.runtime ? ` (${svc.runtime})` : ''}`}
                  style={{ cursor: 'default' }}
                >
                  <ServiceIcon name={svc.name} size={22} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Children — horizontal row with overflow indicator */}
        {children.length > 0 &&
          (() => {
            const maxVisible = Math.min(
              children.length,
              Math.max(2, Math.floor((width - 100) / 36)),
            )
            const visible = children.slice(0, maxVisible)
            const overflow = children.length - maxVisible

            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingTop: 5,
                  borderTop: `1px solid ${colors.border}`,
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {children.length}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {visible.map((c) => (
                    <ChildCircle
                      key={c.id}
                      child={c}
                      onClick={() => onChildClick(c, originalDevice)}
                    />
                  ))}
                  {overflow > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        onChildClick(children[maxVisible], originalDevice)
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: `${colors.textMuted}15`,
                        border: `1.5px solid ${colors.textMuted}33`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 9,
                        color: colors.textMuted,
                        fontWeight: 700,
                        fontFamily: fonts.mono,
                        flexShrink: 0,
                      }}
                    >
                      +{overflow}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
      </div>
    </div>
  )
}
