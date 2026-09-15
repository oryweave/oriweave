import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors as tokenColors, fonts } from '@oriweave/renderer'
import { ApiError, fetchTemplate, fetchTemplates } from '../lib/api'
import { CardThumbnail } from './CardThumbnail'
import { FatalError } from './FatalError'
import type { TemplateCategory, TemplateSummary } from '../lib/api.types'

// Local translucent variant of the card surface, for this page's card background.
const colors = { ...tokenColors, cardBackground: 'rgba(22, 27, 34, 0.6)' }

// 'monitoring'/'home-automation' are deliberate one-off variety colors, not brand tokens.
const categoryColor: Record<TemplateCategory | 'uncategorised', string> = {
  networking: colors.primary,
  media: colors.purple,
  virtualization: colors.amber,
  storage: colors.green,
  monitoring: '#ffd600',
  'home-automation': '#ff5252',
  general: colors.textSecondary,
  uncategorised: colors.textSecondary,
}

interface CategoryOption {
  value: TemplateCategory | null
  label: string
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: null, label: 'ALL' },
  { value: 'general', label: 'GENERAL' },
  { value: 'networking', label: 'NETWORKING' },
  { value: 'media', label: 'MEDIA' },
  { value: 'virtualization', label: 'VIRTUALIZATION' },
  { value: 'storage', label: 'STORAGE' },
  { value: 'monitoring', label: 'MONITORING' },
  { value: 'home-automation', label: 'HOME AUTOMATION' },
]

export const Templates: React.FC = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fatal, setFatal] = useState<{ status: number | null } | null>(null)
  const [category, setCategory] = useState<TemplateCategory | null>(null)
  const [usingSlug, setUsingSlug] = useState<string | null>(null)

  const load = useCallback(async (cat: TemplateCategory | null) => {
    setError(null)
    setFatal(null)
    setTemplates(null)
    try {
      const result = await fetchTemplates(cat ?? undefined)
      setTemplates(result.data)
    } catch (err) {
      if (err instanceof ApiError && (err.isNetwork || (err.status ?? 0) >= 500)) {
        setFatal({ status: err.status })
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    }
  }, [])

  useEffect(() => {
    load(category)
  }, [load, category])

  const handleUse = async (template: TemplateSummary) => {
    setUsingSlug(template.slug)
    try {
      // Don't persist anything yet — just preload the template's YAML into a
      // scratch editor session. Nothing lands in My Configs / the gallery until
      // the user actually shares/saves it (previously, signed-in users got a
      // config forked into their account immediately on click, before any edit,
      // and repeating this for the same template kept creating more of them).
      const detail = await fetchTemplate(template.slug)
      navigate('/editor', { state: { yaml: detail.yaml } })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to use template')
      setUsingSlug(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CategoryFilter selected={category} onSelect={setCategory} />

      {fatal && (
        <FatalError source="/templates" status={fatal.status} onRetry={() => load(category)} />
      )}

      {!fatal && error && (
        <div style={{ color: colors.red, fontFamily: fonts.mono, fontSize: 12, padding: 16 }}>
          {error}
        </div>
      )}

      {!fatal && !error && templates === null && (
        <div
          style={{
            padding: 24,
            color: colors.textMuted,
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          Loading templates...
        </div>
      )}

      {!fatal && !error && templates !== null && templates.length === 0 && (
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
          <div>No templates in this category yet.</div>
        </div>
      )}

      {!fatal && !error && templates !== null && templates.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {templates.map((template) => (
            <TemplateCard
              key={template.slug}
              template={template}
              onPreview={() => navigate(`/s/${template.slug}`)}
              onUse={() => handleUse(template)}
              using={usingSlug === template.slug}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const CategoryFilter: React.FC<{
  selected: TemplateCategory | null
  onSelect: (cat: TemplateCategory | null) => void
}> = ({ selected, onSelect }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
    {CATEGORY_OPTIONS.map((opt) => (
      <CategoryPill
        key={opt.value ?? 'all'}
        label={opt.label}
        active={selected === opt.value}
        onClick={() => onSelect(opt.value)}
      />
    ))}
  </div>
)

const CategoryPill: React.FC<{
  label: string
  active: boolean
  onClick: () => void
}> = ({ label, active, onClick }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '5px 10px',
        background: active ? `${colors.primary}15` : 'transparent',
        border: `1px solid ${active || hovered ? colors.borderHover : colors.border}`,
        borderRadius: 5,
        color: active ? colors.primary : colors.textSecondary,
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  )
}

const TemplateCard: React.FC<{
  template: TemplateSummary
  onPreview: () => void
  onUse: () => void
  using: boolean
}> = ({ template, onPreview, onUse, using }) => {
  const [hovered, setHovered] = useState(false)
  const accent = categoryColor[template.category ?? 'uncategorised']
  const categoryLabel = template.category?.toUpperCase() ?? 'GENERAL'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: colors.cardBackground,
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 8,
        fontFamily: fonts.mono,
        overflow: 'hidden',
        transition: 'border-color 0.12s',
      }}
    >
      <CardThumbnail accent={accent} height={120} />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              color: colors.textPrimary,
              fontSize: 13,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {template.title}
          </div>
          <span
            style={{
              flexShrink: 0,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: accent,
              background: `${accent}15`,
              border: `1px solid ${accent}40`,
            }}
          >
            {categoryLabel}
          </span>
        </div>

        {template.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {template.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '1px 7px',
                  background: 'rgba(255, 152, 0, 0.06)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  color: colors.textSecondary,
                  fontSize: 9,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span
            style={{
              fontSize: 9,
              color: colors.textMuted,
              letterSpacing: '0.04em',
            }}
          >
            {template.viewCount} VIEW{template.viewCount === 1 ? '' : 'S'}
          </span>
          <div style={{ flex: 1 }} />
          <CardButton onClick={onPreview} label="PREVIEW" disabled={using} />
          <CardButton
            onClick={onUse}
            label={using ? '...' : 'USE TEMPLATE'}
            primary
            disabled={using}
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
  disabled?: boolean
}> = ({ onClick, label, primary, disabled }) => {
  const [hovered, setHovered] = useState(false)
  const baseColor = primary ? colors.primary : colors.textSecondary
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
