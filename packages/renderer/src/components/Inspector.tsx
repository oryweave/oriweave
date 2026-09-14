import React, { useState } from 'react'
import { colors, fonts, radii, motion, deviceAccent } from '../theme'
import { getDeviceIconPath, getSpecIconPath } from '../icons'
import { ServiceIcon } from './ServiceIcon'
import type { Device, Connection, Service } from '@oriweave/core'

interface InspectorProps {
  child: Device
  parent?: Device | null
  connections: Connection[]
  width: number
  onClose: () => void
}

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
      borderRadius: radii.xs,
      padding: '1px 6px',
      lineHeight: '16px',
    }}
  >
    {label}
  </span>
)

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 8, letterSpacing: '0.1em', color: colors.textMuted }}>{children}</span>
)

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Label>{label}</Label>
    <span style={{ fontSize: 12, color: colors.textPrimary }}>{value}</span>
  </div>
)

// Single row of the services list — extracted so the conditional
// "no border on last row" logic doesn't bloat the parent JSX.
const ServiceRow: React.FC<{ svc: Service; isLast: boolean }> = ({ svc, isLast }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '6px 0',
      borderBottom: isLast ? 'none' : `1px dashed ${colors.border}`,
    }}
  >
    <ServiceIcon name={svc.name} size={20} />
    <span style={{ color: colors.textPrimary, fontSize: 12, fontWeight: 600, flex: 1 }}>
      {svc.name}
    </span>
    {svc.runtime && (
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: colors.textMuted,
          background: `${colors.textMuted}15`,
          border: `1px solid ${colors.textMuted}25`,
          borderRadius: radii.xs,
          padding: '1px 5px',
        }}
      >
        {svc.runtime}
      </span>
    )}
    {svc.port !== undefined && svc.port !== null && (
      <span
        style={{
          color: colors.textMuted,
          fontSize: 10,
          minWidth: 40,
          textAlign: 'right',
        }}
      >
        :{svc.port}
      </span>
    )}
  </div>
)

/**
 * Right-side slide-in device-detail panel — opens when a device on the canvas is selected.
 * Deliberately has no "LIVE" CPU/MEM section: that would need a real telemetry data source
 * this project doesn't have yet (see HANDOFF-011).
 */
export const Inspector: React.FC<InspectorProps> = ({
  child,
  parent,
  connections,
  width,
  onClose,
}) => {
  const accent = deviceAccent(child.type)
  const specs = child.specs ? Object.entries(child.specs).filter(([, v]) => v) : []
  const services = child.services ?? []
  const tags = child.tags ?? []
  const [copied, setCopied] = useState(false)

  const childConns = connections.filter((c) => c.from === child.id || c.to === child.id)

  const copyId = () => {
    navigator.clipboard
      ?.writeText(child.id)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      })
      .catch(() => {})
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        // Above the canvas's own top title bar (zIndex 10) — the panel spans full height,
        // including over that bar, by design.
        zIndex: 11,
        width,
        borderLeft: `1px solid ${colors.border}`,
        background: colors.backgroundSubtle,
        boxShadow: '-16px 0 32px rgba(0, 0, 0, 0.28)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        fontFamily: fonts.mono,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill={accent}>
          <path d={getDeviceIconPath(child.type)} />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors.textPrimary }}>
          {child.name}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            display: 'flex',
            padding: 2,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {child.ip && <Field label="ADDRESS" value={child.ip} />}
        <Field label="CLASS" value={child.type} />

        {parent && (
          <div
            style={{
              fontSize: 10,
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Hosted on</span>
            <span style={{ color: deviceAccent(parent.type) }}>{parent.name}</span>
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <Label>TAGS</Label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {tags.map((t) => (
                <Tag key={t} label={t} accent={accent} />
              ))}
            </div>
          </div>
        )}

        {specs.length > 0 && (
          <div>
            <Label>HARDWARE</Label>
            <div
              style={{
                marginTop: 6,
                padding: 12,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px 16px',
              }}
            >
              {specs.map(([key, value]) => (
                <div
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
                >
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill={colors.textMuted}
                    style={{ flexShrink: 0 }}
                  >
                    <path d={getSpecIconPath(key)} />
                  </svg>
                  <span
                    style={{
                      fontSize: 10,
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {key}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span
                    style={{
                      fontSize: 11,
                      color: colors.textPrimary,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {value as string}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {services.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Label>SERVICES · {services.length}</Label>
              <div style={{ flex: 1 }} />
              <Label>: PORT</Label>
            </div>
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column' }}>
              {services.map((svc, i) => (
                <ServiceRow key={svc.name} svc={svc} isLast={i === services.length - 1} />
              ))}
            </div>
          </div>
        )}

        {childConns.length > 0 && (
          <div>
            <Label>CONNECTIONS</Label>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {childConns.map((conn, i) => {
                const target = conn.from === child.id ? conn.to : conn.from
                const dir = conn.from === child.id ? '→' : '←'
                return (
                  <div key={i} style={{ fontSize: 11, color: colors.textSecondary }}>
                    {dir} {target}
                    {conn.type && <span style={{ color: colors.textMuted }}> ({conn.type})</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: 12,
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={copyId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: colors.textSecondary,
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: radii.md,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            transition: `all ${motion.fast}`,
          }}
        >
          {copied ? 'copied' : 'copy id'}
        </button>
      </div>
    </div>
  )
}
