import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parse, layout } from '@oriweave/core'
import { TopologyCanvas, colors, fonts } from '@oriweave/renderer'
import type { PositionedGraph, Device, Connection } from '@oriweave/core'
import { AppNav } from '../components/AppNav'
import { buildDeviceMap } from '../lib/device'
import SAMPLE_YAML from '../sample.yaml?raw'

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      padding: '4px 10px',
      background: 'rgba(255, 152, 0, 0.06)',
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      color: colors.textSecondary,
      fontFamily: fonts.mono,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.08em',
    }}
  >
    {children}
  </span>
)

const PreviewFrame: React.FC = () => {
  const [graph, setGraph] = useState<PositionedGraph | null>(null)
  const [deviceMap, setDeviceMap] = useState<Map<string, Device>>(new Map())
  const [connections, setConnections] = useState<Connection[]>([])
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    try {
      const result = parse(SAMPLE_YAML)
      if (!result.ok) {
        console.warn(
          'LandingPage: seed YAML failed to parse — preview will show empty fallback.',
          result.errors,
        )
        setErrored(true)
        return
      }
      const positioned = layout(result.document)
      setGraph(positioned)
      setDeviceMap(buildDeviceMap(result.document.devices))
      setConnections(result.document.connections ?? [])
    } catch (err) {
      console.warn('LandingPage: layout threw while building preview.', err)
      setErrored(true)
    }
  }, [])

  if (errored || !graph) {
    return <div style={{ width: '100%', height: '100%' }} />
  }

  return (
    <div
      style={{
        transform: 'scale(0.45)',
        transformOrigin: 'top left',
        width: 'calc(100% / 0.45)',
        height: 'calc(100% / 0.45)',
        pointerEvents: 'none',
      }}
    >
      <TopologyCanvas graph={graph} deviceMap={deviceMap} connections={connections} readOnly />
    </div>
  )
}

// ── LandingPage ────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [primaryCtaHovered, setPrimaryCtaHovered] = useState(false)
  const [ghostCtaHovered, setGhostCtaHovered] = useState(false)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        color: colors.textPrimary,
        fontFamily: fonts.mono,
      }}
    >
      {/* No header CTA here — the hero's own "$ ORIWEAVE NEW" button already
          covers it; showing both read as redundant. */}
      <AppNav primaryAction={<></>} />

      {/* Hero */}
      <main
        style={{
          display: 'flex',
          gap: 40,
          padding: '60px 28px',
          maxWidth: 1280,
          margin: '0 auto',
          minHeight: 'calc(100vh - 60px)',
          alignItems: 'center',
        }}
      >
        {/* Left — text */}
        <div
          style={{
            width: 380,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <span
            style={{
              color: colors.textMuted,
              fontSize: 10,
              letterSpacing: '0.14em',
              fontWeight: 600,
            }}
          >
            ── HOMELAB · INFRASTRUCTURE · YAML
          </span>

          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: colors.textPrimary,
              fontFamily: fonts.mono,
            }}
          >
            Document your
            <br />
            <span style={{ color: colors.primary }}>homelab as YAML.</span>
            <br />
            render it as a live topology.
          </h1>

          <p
            style={{
              margin: 0,
              color: colors.textSecondary,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Treat your home infrastructure like production: one canonical file, validated on save,
            rendered as a diagram you can share. No drag-and-drop, no proprietary format, no
            lock-in.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={() => navigate('/editor')}
              onMouseEnter={() => setPrimaryCtaHovered(true)}
              onMouseLeave={() => setPrimaryCtaHovered(false)}
              style={{
                padding: '10px 16px',
                background: primaryCtaHovered
                  ? 'rgba(255, 152, 0, 0.18)'
                  : 'rgba(255, 152, 0, 0.1)',
                border: `1px solid ${colors.primary}`,
                borderRadius: 5,
                color: colors.primary,
                cursor: 'pointer',
                fontFamily: fonts.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                transition: 'background 0.12s',
              }}
            >
              $ ORIWEAVE NEW
            </button>
            <button
              onClick={() => navigate('/gallery')}
              onMouseEnter={() => setGhostCtaHovered(true)}
              onMouseLeave={() => setGhostCtaHovered(false)}
              style={{
                padding: '10px 16px',
                background: ghostCtaHovered ? 'rgba(255, 152, 0, 0.06)' : 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: 5,
                color: colors.textSecondary,
                cursor: 'pointer',
                fontFamily: fonts.mono,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                transition: 'background 0.12s',
              }}
            >
              VIEW GALLERY
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 12,
            }}
          >
            <Badge>SELF-HOSTABLE</Badge>
            <Badge>MIT</Badge>
            <Badge>DOCKER</Badge>
            <Badge>PROXMOX-FRIENDLY</Badge>
          </div>
        </div>

        {/* Right — preview */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: 540,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            background: 'rgba(13, 17, 23, 0.4)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <PreviewFrame />
        </div>
      </main>
    </div>
  )
}
