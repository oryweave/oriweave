import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { parse, layout } from '@oriweave/core'
import { TopologyCanvas } from '@oriweave/renderer'
import { AppNav } from '../components/AppNav'
import { buildDeviceMap } from '../lib/device'
import { fetchConfig, forkConfig, deleteConfig } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import type { SharedConfig } from '../lib/api.types'

const colors = {
  background: '#080f1e',
  backgroundSubtle: '#0c1527',
  border: 'rgba(0, 229, 255, 0.12)',
  borderHover: 'rgba(0, 229, 255, 0.35)',
  primary: '#00e5ff',
  green: '#00e676',
  red: '#ff1744',
  textPrimary: '#e0f7fa',
  textSecondary: '#78909c',
  textMuted: '#455a64',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

const EditNavButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        background: hovered ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
        border: `1px solid ${colors.primary}`,
        borderRadius: 5,
        color: colors.primary,
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        transition: 'background 0.15s',
      }}
    >
      EDIT
    </button>
  )
}

export const SharedView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [config, setConfig] = useState<SharedConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)

    fetchConfig(slug)
      .then(setConfig)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  const { graph, deviceMap, connections, networkCount } = useMemo(() => {
    if (!config) return { graph: null, deviceMap: new Map(), connections: [], networkCount: 0 }

    const result = parse(config.yaml)
    if (!result.ok) return { graph: null, deviceMap: new Map(), connections: [], networkCount: 0 }

    try {
      const positioned = layout(result.document)
      const dMap = buildDeviceMap(result.document.devices)
      return {
        graph: positioned,
        deviceMap: dMap,
        connections: result.document.connections ?? [],
        networkCount: result.document.networks?.length ?? 0,
      }
    } catch {
      return { graph: null, deviceMap: new Map(), connections: [], networkCount: 0 }
    }
  }, [config])

  const isOwner = Boolean(config?.author && user && config.author.username === user.username)

  const handleFork = useCallback(async () => {
    if (!slug) return
    try {
      const result = await forkConfig(slug)
      // Forked config is saved server-side — navigate to its shared view so the user
      // sees the new slug. (Editor with route state would lose the slug on refresh.)
      navigate(`/s/${result.slug}`)
    } catch (err) {
      console.error('Fork failed:', err)
    }
  }, [slug, navigate])

  const handleOpenInEditor = useCallback(() => {
    navigate('/editor', { state: { yaml: config?.yaml } })
  }, [config, navigate])

  const handleEditOwnConfig = useCallback(() => {
    if (!slug) return
    navigate(`/edit/${slug}`)
  }, [slug, navigate])

  const handleDelete = useCallback(async () => {
    if (!slug || !config) return
    const confirmed = window.confirm(`Delete "${config.title}"? This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    try {
      await deleteConfig(slug)
      navigate('/')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete config')
      setDeleting(false)
    }
  }, [slug, config, navigate])

  // Nav primary action: owners see EDIT (jumps to /edit/<slug>); visitors get
  // the AppNav's default NEW DIAGRAM button via the unset prop.
  const navPrimaryAction = isOwner ? <EditNavButton onClick={handleEditOwnConfig} /> : undefined

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.background,
          fontFamily: fonts.mono,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppNav />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            fontSize: 13,
          }}
        >
          Loading topology...
        </div>
      </div>
    )
  }

  // Error state
  if (error || !config) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.background,
          fontFamily: fonts.mono,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppNav />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            fontSize: 13,
            gap: 16,
          }}
        >
          <div style={{ fontSize: 32, opacity: 0.4 }}>404</div>
          <div>{error || 'Config not found'}</div>
        </div>
      </div>
    )
  }

  // No valid graph — still let the user open it in editor to fix.
  if (!graph) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.background,
          fontFamily: fonts.mono,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppNav primaryAction={navPrimaryAction} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            fontSize: 13,
            gap: 16,
          }}
        >
          <div style={{ fontSize: 32, opacity: 0.4 }}>⚠</div>
          <div>This config has invalid YAML</div>
          <button
            onClick={isOwner ? handleEditOwnConfig : handleOpenInEditor}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              color: colors.primary,
              cursor: 'pointer',
              fontFamily: fonts.mono,
              fontSize: 12,
            }}
          >
            {isOwner ? 'Edit to Fix' : 'Open in Editor to Fix'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: colors.background,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppNav primaryAction={navPrimaryAction} />

      {/* Topology canvas — takes remaining vertical space. The canvas's own
          bottom-anchored controls (zoom, fit, reset) now clear the shared
          bottom bar because they're positioned within this flex item, not
          the viewport. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      >
        <TopologyCanvas graph={graph} deviceMap={deviceMap} connections={connections} />
      </div>

      {/* Bottom bar — shared config info */}
      <div
        style={{
          flexShrink: 0,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 20px',
          background: 'rgba(8,15,30,0.92)',
          backdropFilter: 'blur(8px)',
          borderTop: `1px solid ${colors.border}`,
          fontFamily: fonts.mono,
          zIndex: 10,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: author + metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {config.author && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {config.author.avatarUrl && (
                <img
                  src={config.author.avatarUrl}
                  alt={config.author.username}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    border: `1px solid ${colors.border}`,
                  }}
                />
              )}
              <a
                href={`https://github.com/${config.author.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: colors.textSecondary,
                  fontSize: 10,
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                @{config.author.username}
              </a>
              {isOwner && (
                <span
                  style={{
                    padding: '1px 6px',
                    background: `${colors.primary}15`,
                    border: `1px solid ${colors.primary}44`,
                    borderRadius: 8,
                    color: colors.primary,
                    fontSize: 8,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  YOU
                </span>
              )}
            </div>
          )}
          <span style={{ color: colors.textSecondary, fontSize: 10 }}>Shared topology</span>
          {config.forkOf && (
            <span style={{ color: colors.textMuted, fontSize: 10 }}>
              forked from {config.forkOf}
            </span>
          )}
          <CountsChip
            networkCount={networkCount}
            deviceCount={deviceMap.size}
            connectionCount={connections.length}
          />
          <span style={{ color: colors.textMuted, fontSize: 10 }}>
            {config.viewCount} view{config.viewCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isOwner ? (
            <>
              <ActionPill
                onClick={handleDelete}
                disabled={deleting}
                color={colors.red}
                label={deleting ? 'DELETING...' : 'DELETE'}
                icon={
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                }
              />
              <ActionPill
                onClick={handleEditOwnConfig}
                color={colors.primary}
                label="EDIT"
                primary
                icon={
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                }
              />
            </>
          ) : (
            <>
              <ActionPill
                onClick={handleOpenInEditor}
                color={colors.textSecondary}
                label="OPEN IN EDITOR"
                icon={
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                }
              />
              <ActionPill
                onClick={handleFork}
                color={colors.primary}
                label="FORK"
                primary
                icon={
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 3a3 3 0 00-1 5.83v6.34a3.001 3.001 0 102 0V15a2 2 0 002-2V9h3.17a3.001 3.001 0 100-2H9v6a4 4 0 01-4 4v.17A3.001 3.001 0 006 3z" />
                  </svg>
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const ActionPill: React.FC<{
  onClick: () => void
  label: string
  icon: React.ReactNode
  color: string
  primary?: boolean
  disabled?: boolean
}> = ({ onClick, label, icon, color, primary, disabled }) => {
  const [hovered, setHovered] = useState(false)

  const baseBg = primary ? `${color}15` : 'transparent'
  const hoverBg = primary ? `${color}25` : `${color}10`
  const baseBorder = primary ? `1px solid ${color}44` : `1px solid ${colors.border}`
  const hoverBorder = `1px solid ${color}88`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        background: hovered && !disabled ? hoverBg : baseBg,
        border: hovered && !disabled ? hoverBorder : baseBorder,
        borderRadius: 5,
        color: primary ? color : hovered && !disabled ? color : colors.textSecondary,
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 600,
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

const CountsChip: React.FC<{
  networkCount: number
  deviceCount: number
  connectionCount: number
}> = ({ networkCount, deviceCount, connectionCount }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 8px',
      border: `1px solid ${colors.border}`,
      borderRadius: 4,
      color: colors.textMuted,
      fontSize: 9,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      fontWeight: 600,
    }}
  >
    <span
      style={{
        width: 5,
        height: 5,
        borderRadius: 3,
        background: colors.green,
        boxShadow: `0 0 5px ${colors.green}`,
      }}
      aria-label="status valid"
    />
    <span>
      {networkCount} {networkCount === 1 ? 'NETWORK' : 'NETWORKS'}
    </span>
    <span style={{ opacity: 0.5 }} aria-hidden="true">
      ·
    </span>
    <span>
      {deviceCount} {deviceCount === 1 ? 'DEVICE' : 'DEVICES'}
    </span>
    <span style={{ opacity: 0.5 }} aria-hidden="true">
      ·
    </span>
    <span>
      {connectionCount} {connectionCount === 1 ? 'CONNECTION' : 'CONNECTIONS'}
    </span>
  </div>
)
