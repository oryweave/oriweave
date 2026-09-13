import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, fetchMyConfigs, deleteConfig } from '../lib/api'
import { FatalError } from './FatalError'
import type { MyConfig } from '../lib/api.types'

const colors = {
  background: '#0D1117',
  cardBackground: 'rgba(22, 27, 34, 0.6)',
  border: 'rgba(38, 198, 218, 0.12)',
  borderHover: 'rgba(38, 198, 218, 0.35)',
  primary: '#26C6DA',
  red: '#ff1744',
  textPrimary: '#E0E0E0',
  textSecondary: '#8B949E',
  textMuted: '#6E7681',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type LEDTone = 'green' | 'amber'

function visibilityToLEDTone(visibility: string): LEDTone {
  return visibility === 'public' ? 'green' : 'amber'
}

function visibilityColor(visibility: string): string {
  if (visibility === 'public') return '#00e676'
  if (visibility === 'private') return '#FF9800'
  if (visibility === 'unlisted') return '#8B949E'
  return '#8B949E'
}

const ledStyle = (tone: LEDTone): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: tone === 'green' ? '#00e676' : '#FF9800',
  boxShadow: tone === 'green' ? '0 0 6px rgba(0, 230, 118, 0.6)' : '0 0 6px rgba(255, 152, 0, 0.6)',
  flexShrink: 0,
})

function buildKickerText(diagramCount: number, totalViews: number): string {
  const diagramWord = diagramCount === 1 ? 'diagram' : 'diagrams'
  const viewWord = totalViews === 1 ? 'view' : 'views'
  return `// ${diagramCount} ${diagramWord}, ${totalViews} total ${viewWord}`
}

export const MyConfigs: React.FC = () => {
  const navigate = useNavigate()
  const [configs, setConfigs] = useState<MyConfig[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fatal, setFatal] = useState<{ status: number | null } | null>(null)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setFatal(null)
    try {
      const data = await fetchMyConfigs()
      setConfigs(data)
    } catch (err) {
      if (err instanceof ApiError && (err.isNetwork || (err.status ?? 0) >= 500)) {
        setFatal({ status: err.status })
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load configs')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (slug: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`)
    if (!confirmed) return

    setDeletingSlug(slug)
    try {
      await deleteConfig(slug)
      setConfigs((prev) => prev?.filter((c) => c.slug !== slug) ?? null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete config')
    } finally {
      setDeletingSlug(null)
    }
  }

  if (fatal) {
    return (
      <div style={{ padding: 24 }}>
        <FatalError source="/configs/user/me" status={fatal.status} onRetry={load} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          color: colors.red,
          fontFamily: fonts.mono,
          fontSize: 12,
        }}
      >
        {error}
      </div>
    )
  }

  if (configs === null) {
    return (
      <div
        style={{
          padding: 24,
          color: colors.textMuted,
          fontFamily: fonts.mono,
          fontSize: 12,
        }}
      >
        Loading your configs...
      </div>
    )
  }

  if (configs.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: 'center',
          color: colors.textMuted,
          fontFamily: fonts.mono,
          fontSize: 12,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>∅</div>
        <div style={{ marginBottom: 16 }}>You haven&rsquo;t saved any configs yet.</div>
        <button
          onClick={() => navigate('/editor')}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            color: colors.primary,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          GO TO EDITOR
        </button>
      </div>
    )
  }

  const totalViews = configs.reduce((sum, c) => sum + (c.viewCount ?? 0), 0)
  const kickerText = buildKickerText(configs.length, totalViews)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SubHeader kickerText={kickerText} onNew={() => navigate('/editor')} />
      {configs.map((config) => (
        <ConfigCard
          key={config.slug}
          config={config}
          onView={() => navigate(`/s/${config.slug}`)}
          onEdit={() => navigate(`/edit/${config.slug}`)}
          onDelete={() => handleDelete(config.slug, config.title)}
          deleting={deletingSlug === config.slug}
        />
      ))}
    </div>
  )
}

const SubHeader: React.FC<{ kickerText: string; onNew: () => void }> = ({ kickerText, onNew }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingBottom: 16,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: 0,
        }}
      >
        {kickerText}
      </span>
      <div style={{ flex: 1 }} />
      <button
        onClick={onNew}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 12px',
          background: hovered ? 'rgba(38, 198, 218, 0.1)' : 'transparent',
          border: `1px solid ${colors.primary}`,
          borderRadius: 5,
          color: colors.primary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          transition: 'background 0.12s',
        }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
        NEW
      </button>
    </div>
  )
}

const ConfigCard: React.FC<{
  config: MyConfig
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}> = ({ config, onView, onEdit, onDelete, deleting }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 16,
        background: colors.cardBackground,
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 8,
        fontFamily: fonts.mono,
        transition: 'border-color 0.12s',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              aria-label={`visibility ${config.visibility}`}
              style={ledStyle(visibilityToLEDTone(config.visibility))}
            />
            <div
              style={{
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {config.title}
            </div>
          </div>
          <div
            style={{
              color: colors.textMuted,
              fontSize: 10,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>/{config.slug}</span>
            <span
              style={{
                color: visibilityColor(config.visibility),
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontSize: 9,
              }}
            >
              {config.visibility}
            </span>
            <span>
              {config.viewCount} view{config.viewCount !== 1 ? 's' : ''}
            </span>
            <span>updated {formatDate(config.updatedAt)}</span>
          </div>
          {config.tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 8,
              }}
            >
              {config.tags.map((t) => (
                <span
                  key={t.tag}
                  style={{
                    padding: '2px 8px',
                    background: 'rgba(38, 198, 218, 0.06)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    color: colors.textSecondary,
                    fontSize: 9,
                  }}
                >
                  {t.tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <CardButton onClick={onView} label="VIEW" />
          <CardButton onClick={onEdit} label="EDIT" primary />
          <CardButton
            onClick={onDelete}
            label={deleting ? '...' : 'DELETE'}
            danger
            disabled={deleting}
          />
        </div>
      </div>
    </div>
  )
}

const CardButton: React.FC<{
  onClick: () => void
  label: string
  primary?: boolean
  danger?: boolean
  disabled?: boolean
}> = ({ onClick, label, primary, danger, disabled }) => {
  const [hovered, setHovered] = useState(false)
  const baseColor = danger ? colors.red : primary ? colors.primary : colors.textSecondary
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 10px',
        background: hovered && !disabled ? `${baseColor}15` : 'transparent',
        border: `1px solid ${hovered && !disabled ? baseColor : colors.border}`,
        borderRadius: 5,
        color: hovered && !disabled ? baseColor : colors.textSecondary,
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'all 0.12s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}
