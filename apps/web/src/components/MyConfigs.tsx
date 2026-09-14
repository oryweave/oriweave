import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors as tokenColors, fonts, radii, motion } from '@oriweave/renderer'
import { ApiError, fetchMyConfigs, deleteConfig } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { FatalError } from './FatalError'
import type { MyConfig } from '../lib/api.types'

// Local translucent variant of the card surface, for this page's card background.
const colors = { ...tokenColors, cardBackground: 'rgba(22, 27, 34, 0.6)' }

const GRID_COLUMNS = '24px 1fr 240px 130px 80px 70px 130px'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type LEDTone = 'green' | 'amber' | 'muted'

function visibilityToLEDTone(visibility: string): LEDTone {
  if (visibility === 'public') return 'green'
  if (visibility === 'private') return 'amber'
  return 'muted'
}

function visibilityColor(visibility: string): string {
  if (visibility === 'public') return colors.green
  if (visibility === 'private') return colors.amber
  return colors.textSecondary
}

const ledColor: Record<LEDTone, string> = {
  green: colors.green,
  amber: colors.amber,
  muted: colors.textMuted,
}

const ledStyle = (tone: LEDTone): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: ledColor[tone],
  boxShadow: tone === 'muted' ? 'none' : `0 0 6px ${ledColor[tone]}99`,
  flexShrink: 0,
})

function buildKickerText(diagramCount: number, totalViews: number): string {
  const diagramWord = diagramCount === 1 ? 'diagram' : 'diagrams'
  const viewWord = totalViews === 1 ? 'view' : 'views'
  return `// ${diagramCount} ${diagramWord}, ${totalViews} total ${viewWord}`
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

export const MyConfigs: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
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
            borderRadius: radii.md,
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
    <div>
      <SubHeader
        kickerText={kickerText}
        username={user?.username ?? null}
        onNew={() => navigate('/editor')}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
          padding: '14px 8px',
          borderBottom: `1px solid ${colors.border}`,
          fontSize: 9,
          color: colors.textMuted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        <span />
        <span>Name</span>
        <span>Tags</span>
        <span>Updated</span>
        <span>Views</span>
        <span>Vis</span>
        <span style={{ textAlign: 'right' }}>Actions</span>
      </div>
      {configs.map((config) => (
        <ConfigRow
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

const SubHeader: React.FC<{ kickerText: string; username: string | null; onNew: () => void }> = ({
  kickerText,
  username,
  onNew,
}) => {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 14,
        paddingBottom: 16,
        marginBottom: 4,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: fonts.sans,
          fontSize: 18,
          fontWeight: 700,
          color: colors.textPrimary,
        }}
      >
        My Configs
      </h2>
      <span style={{ color: colors.textMuted, fontSize: 11 }}>{kickerText}</span>
      <div style={{ flex: 1 }} />
      {username && (
        <span style={{ fontSize: 10, color: colors.textMuted }}>
          synced from{' '}
          <b style={{ color: colors.textSecondary, fontWeight: 700 }}>github:{username}</b>
        </span>
      )}
      <button
        onClick={onNew}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          background: hovered ? 'rgba(255, 152, 0, 0.18)' : colors.primaryDim,
          border: `1px solid ${colors.primaryBorder}`,
          borderRadius: radii.sm,
          color: colors.primary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          transition: `background ${motion.fast}`,
        }}
      >
        <span style={{ fontSize: 13, lineHeight: 1 }}>+</span>
        NEW
      </button>
    </div>
  )
}

const tagPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 6px',
  background: 'rgba(139, 148, 158, 0.08)',
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xs,
  color: colors.textSecondary,
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  lineHeight: '14px',
  whiteSpace: 'nowrap',
}

const ConfigRow: React.FC<{
  config: MyConfig
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}> = ({ config, onView, onEdit, onDelete, deleting }) => {
  const [rowHovered, setRowHovered] = useState(false)
  const [copiedField, setCopiedField] = useState<'share' | 'copy' | null>(null)

  const flashCopied = (field: 'share' | 'copy') => {
    setCopiedField(field)
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 2000)
  }

  const handleShare = async () => {
    await copyToClipboard(`${window.location.origin}/s/${config.slug}`)
    flashCopied('share')
  }

  const handleCopyYaml = async () => {
    await copyToClipboard(config.yaml)
    flashCopied('copy')
  }

  return (
    <div
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        alignItems: 'center',
        padding: '12px 8px',
        borderBottom: `1px solid ${colors.border}`,
        fontSize: 11,
        fontFamily: fonts.mono,
        background: rowHovered ? 'rgba(255, 255, 255, 0.015)' : 'transparent',
        transition: `background ${motion.fast}`,
      }}
    >
      <span
        aria-label={`visibility ${config.visibility}`}
        style={ledStyle(visibilityToLEDTone(config.visibility))}
      />
      <span
        onClick={onView}
        title="View"
        style={{
          color: colors.textPrimary,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          cursor: 'pointer',
        }}
      >
        {config.title}
      </span>
      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {config.tags.map((t) => (
          <span key={t.tag} style={tagPillStyle}>
            {t.tag}
          </span>
        ))}
      </span>
      <span style={{ color: colors.textSecondary, fontSize: 10 }}>
        {formatDate(config.updatedAt)}
      </span>
      <span style={{ color: colors.textSecondary, fontSize: 10 }}>{config.viewCount}</span>
      <span
        style={{
          fontSize: 8,
          color: visibilityColor(config.visibility),
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}
      >
        {config.visibility.toUpperCase()}
      </span>
      <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <RowIconButton icon={<EditIcon />} label="Edit" onClick={onEdit} />
        <RowIconButton
          icon={copiedField === 'share' ? <CheckIcon /> : <ShareIcon />}
          label={copiedField === 'share' ? 'Copied!' : 'Copy share link'}
          onClick={handleShare}
          tone={copiedField === 'share' ? 'green' : 'default'}
        />
        <RowIconButton
          icon={copiedField === 'copy' ? <CheckIcon /> : <CopyIcon />}
          label={copiedField === 'copy' ? 'Copied!' : 'Copy YAML'}
          onClick={handleCopyYaml}
          tone={copiedField === 'copy' ? 'green' : 'default'}
        />
        <RowIconButton
          icon={<TrashIcon />}
          label={deleting ? 'Deleting…' : 'Delete'}
          onClick={onDelete}
          tone="danger"
          disabled={deleting}
        />
      </span>
    </div>
  )
}

const RowIconButton: React.FC<{
  icon: React.ReactNode
  label: string
  onClick: () => void
  tone?: 'default' | 'danger' | 'green'
  disabled?: boolean
}> = ({ icon, label, onClick, tone = 'default', disabled }) => {
  const [hovered, setHovered] = useState(false)
  const toneColor =
    tone === 'danger' ? colors.red : tone === 'green' ? colors.green : colors.textMuted
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        padding: 0,
        background: 'transparent',
        border: 'none',
        borderRadius: radii.sm,
        color: hovered && !disabled ? toneColor : tone === 'green' ? toneColor : colors.textMuted,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `color ${motion.fast}`,
      }}
    >
      {icon}
    </button>
  )
}

const EditIcon: React.FC = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
)

const ShareIcon: React.FC = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 16.08a2.91 2.91 0 00-1.96.77L8.91 12.7a3.27 3.27 0 000-1.4l7.05-4.11A3 3 0 1015 5a3.27 3.27 0 00.09.7L8.04 9.81a3 3 0 100 4.38l7.12 4.16a2.82 2.82 0 00-.08.65 2.92 2.92 0 102.92-2.92z" />
  </svg>
)

const CopyIcon: React.FC = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 1H4a2 2 0 00-2 2v14h2V3h12V1zm3 4H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11v14z" />
  </svg>
)

const TrashIcon: React.FC = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
)

const CheckIcon: React.FC = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
)
