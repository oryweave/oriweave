import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors as tokenColors, fonts } from '@oriweave/renderer'
import { createConfig, updateConfig } from '../lib/api'
import { useAuth } from '../context/AuthContext'

interface SharePanelProps {
  yaml: string
  isExporting: boolean
  editingSlug?: string
  initialVisibility?: 'public' | 'unlisted'
  onExportPng: () => void
}

// Local alpha-blended variant of the surface token, for this dropdown's background.
const colors = { ...tokenColors, background: 'rgba(22, 27, 34, 0.95)' }

const sectionLabel: React.CSSProperties = {
  fontSize: 9,
  color: colors.textMuted,
  letterSpacing: '0.1em',
  fontWeight: 700,
}

const ActionButton: React.FC<{
  onClick: () => void
  icon: React.ReactNode
  label: string
  sublabel?: string
  disabled?: boolean
  tone?: 'default' | 'primary'
}> = ({ onClick, icon, label, sublabel, disabled, tone = 'default' }) => {
  const [hovered, setHovered] = useState(false)

  const iconColor = hovered
    ? colors.primary
    : tone === 'primary'
      ? colors.primary
      : colors.textSecondary

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 10px',
        background: hovered ? 'rgba(255, 152, 0, 0.06)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 6,
        color: colors.textPrimary,
        cursor: disabled ? 'wait' : 'pointer',
        fontFamily: fonts.mono,
        fontSize: 12,
        textAlign: 'left',
        transition: 'all 0.12s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ color: iconColor, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: colors.textPrimary,
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            style={{
              fontSize: 9,
              color: colors.textMuted,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </button>
  )
}

export const SharePanel: React.FC<SharePanelProps> = ({
  yaml,
  onExportPng,
  isExporting,
  editingSlug,
  initialVisibility,
}) => {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [justShared, setJustShared] = useState(false)
  const [shareResult, setShareResult] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>(
    initialVisibility ?? 'unlisted',
  )
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialVisibility) setVisibility(initialVisibility)
  }, [initialVisibility])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const publicUrl = editingSlug ? `${window.location.origin}/s/${editingSlug}` : shareResult

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yaml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = yaml
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadYaml = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'homelab-topology.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async (text: string) => {
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

  const handleCopyUrl = async () => {
    if (!publicUrl) return
    await copyToClipboard(publicUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  const handlePrimaryAction = async () => {
    setSharing(true)
    setShareError(null)
    setShareResult(null)

    try {
      const result = editingSlug
        ? await updateConfig(editingSlug, yaml, visibility)
        : await createConfig(yaml, visibility)
      const url = `${window.location.origin}/s/${result.slug}`

      await copyToClipboard(url)

      setShareResult(url)
      setJustShared(true)
      setTimeout(() => setJustShared(false), 2000)

      // First share of this session, while signed in: move onto /edit/:slug so
      // further saves update this config instead of creating a new one each time
      // (previously every "Share as Link" click from /editor created a fresh row,
      // littering the gallery/My Configs with near-duplicates from the same author).
      if (!editingSlug && isLoggedIn) {
        navigate(`/edit/${result.slug}`, { replace: true })
      }
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Failed to share')
      setTimeout(() => setShareError(null), 4000)
    } finally {
      setSharing(false)
    }
  }

  const primaryLabel = sharing
    ? editingSlug
      ? 'Updating...'
      : 'Creating link...'
    : justShared
      ? editingSlug
        ? 'Updated!'
        : 'Link copied!'
      : editingSlug
        ? 'Update Config'
        : publicUrl
          ? 'Share again'
          : 'Share as Link'

  const primarySublabel = editingSlug
    ? 'Save changes to this config'
    : publicUrl
      ? 'Generate a new URL'
      : isLoggedIn
        ? 'Generate a shareable URL (saved to your account)'
        : 'Generate a shareable URL'

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.borderHover
          e.currentTarget.style.color = colors.primary
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.border
          e.currentTarget.style.color = colors.textSecondary
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          color: colors.textSecondary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          transition: 'all 0.12s',
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
        </svg>
        {editingSlug ? 'SAVE' : 'SHARE'}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            zIndex: 30,
            width: 320,
            padding: 8,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={sectionLabel}>PUBLIC URL</div>

          {/* URL row — always rendered when panel is open; content depends on publicUrl */}
          <div
            onClick={publicUrl ? handleCopyUrl : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: 'rgba(13, 17, 23, 0.6)',
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.primary,
              cursor: publicUrl ? 'pointer' : 'default',
            }}
          >
            {publicUrl ? (
              <>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {publicUrl.replace(/^https?:\/\//, '')}
                </span>
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ color: colors.textSecondary, flexShrink: 0 }}
                >
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              </>
            ) : (
              <span style={{ color: colors.textMuted, flex: 1 }}>not yet shared</span>
            )}
          </div>

          {urlCopied && (
            <div
              style={{
                fontSize: 9,
                color: colors.green,
                marginTop: -4,
                paddingLeft: 2,
                fontFamily: fonts.mono,
              }}
            >
              ✓ URL copied to clipboard
            </div>
          )}

          <div style={{ ...sectionLabel, marginTop: 4 }}>VISIBILITY</div>

          <div style={{ display: 'flex', gap: 4 }}>
            {(['unlisted', 'public'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setVisibility(option)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  background:
                    visibility === option ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${visibility === option ? colors.primary : colors.border}`,
                  borderRadius: 5,
                  color: visibility === option ? colors.primary : colors.textSecondary,
                  cursor: 'pointer',
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  transition: 'all 0.12s',
                }}
              >
                {option}
              </button>
            ))}
          </div>
          <div
            style={{
              fontSize: 9,
              color: colors.textMuted,
              paddingLeft: 2,
              fontFamily: fonts.mono,
            }}
          >
            {visibility === 'public'
              ? 'Listed in the public gallery'
              : 'Only visible to people with the link'}
          </div>

          {/* Primary action — share new or update existing */}
          <ActionButton
            onClick={handlePrimaryAction}
            disabled={sharing}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
            }
            label={primaryLabel}
            sublabel={primarySublabel}
          />

          {shareError && (
            <div
              style={{
                padding: '6px 10px',
                background: 'rgba(255,23,68,0.1)',
                border: '1px solid rgba(255,23,68,0.25)',
                borderRadius: 5,
                fontSize: 9,
                color: colors.red,
                fontFamily: fonts.mono,
              }}
            >
              {shareError}
            </div>
          )}

          <div style={{ ...sectionLabel, marginTop: 4 }}>EXPORT AS</div>

          <ActionButton
            onClick={onExportPng}
            disabled={isExporting}
            tone="primary"
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
            }
            label={isExporting ? 'Exporting...' : 'Export as PNG'}
            sublabel="High-res image for Reddit · Ctrl+Shift+P"
          />

          <ActionButton
            onClick={handleCopyYaml}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
            }
            label={copied ? 'Copied!' : 'Copy YAML'}
            sublabel="Share your config with others"
          />

          <ActionButton
            onClick={handleDownloadYaml}
            icon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
            }
            label="Download YAML"
            sublabel="Save as homelab-topology.yaml"
          />
        </div>
      )}
    </div>
  )
}
