import React from 'react'
import { colors, fonts, deviceAccent } from '../theme'
import { getDeviceIconPath, getSpecIconPath } from '../icons'
import { ServiceIcon } from './ServiceIcon'
import type { Device, Connection, Service } from '@oriweave/core'

interface DetailModalProps {
  child: Device
  parent?: Device | null
  connections: Connection[]
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
      borderRadius: 3,
      padding: '1px 6px',
      lineHeight: '16px',
    }}
  >
    {label}
  </span>
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
          borderRadius: 3,
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

export const DetailModal: React.FC<DetailModalProps> = ({
  child,
  parent,
  connections,
  onClose,
}) => {
  const accent = deviceAccent(child.type)
  const specs = child.specs ? Object.entries(child.specs).filter(([, v]) => v) : []
  const services = child.services ?? []
  const tags = child.tags ?? []

  const childConns = connections.filter((c) => c.from === child.id || c.to === child.id)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: fonts.mono,
      }}
    >
      {/*
        Outer wrapper is now a flex *row* so the left-edge accent bar
        can sit alongside the scrollable content. `overflow: hidden`
        on the wrapper clips the rounded corners; the inner content
        div owns the scroll.
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxHeight: '80vh',
          background: colors.backgroundSubtle,
          border: `1px solid ${accent}44`,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: `0 0 40px ${accent}22`,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Left accent bar. */}
        <div style={{ width: 3, background: accent, flexShrink: 0 }} />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: `${accent}15`,
                border: `1.5px solid ${accent}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill={accent}>
                <path d={getDeviceIconPath(child.type)} />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 700 }}>
                {child.name}
              </div>
              {child.ip && (
                <div style={{ color: colors.textSecondary, fontSize: 11 }}>{child.ip}</div>
              )}
            </div>
            <Tag label={child.type.toUpperCase()} accent={accent} />
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                fontSize: 20,
                padding: '0 4px',
                lineHeight: 1,
                fontFamily: fonts.mono,
              }}
            >
              ×
            </button>
          </div>

          {/* Parent info */}
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

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {tags.map((t) => (
                <Tag key={t} label={t} accent={accent} />
              ))}
            </div>
          )}

          {/*
            Bordered container with a HARDWARE label and a 2-column grid of KEY → VALUE rows.
            Odd numbers of specs leave the last cell empty;
          */}
          {specs.length > 0 && (
            <div
              style={{
                padding: 12,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: 5,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: colors.textMuted,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Hardware
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 16px',
                }}
              >
                {specs.map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 0,
                    }}
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

          {/* Services */}
          {services.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 9,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                <span>Services · {services.length}</span>
                <div style={{ flex: 1 }} />
                <span>: Port</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {services.map((svc, i) => (
                  <ServiceRow key={svc.name} svc={svc} isLast={i === services.length - 1} />
                ))}
              </div>
            </div>
          )}

          {/* Connections */}
          {childConns.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                Connections
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
      </div>
    </div>
  )
}
