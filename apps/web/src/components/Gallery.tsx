import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors as tokenColors, fonts } from '@oriweave/renderer'
import { ApiError, fetchGallery } from '../lib/api'
import { CardThumbnail } from './CardThumbnail'
import { FatalError } from './FatalError'
import type { GallerySort, GallerySummary } from '../lib/api.types'

// Local translucent variant of the card surface, for this page's card background.
const colors = { ...tokenColors, cardBackground: 'rgba(22, 27, 34, 0.6)' }

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const SORT_OPTIONS: { value: GallerySort; label: string }[] = [
  { value: 'recent', label: 'RECENT' },
  { value: 'popular', label: 'POPULAR' },
  { value: 'most_forked', label: 'MOST FORKED' },
]

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// The last two are deliberate one-off variety colors, not brand tokens.
const GALLERY_COLOURS = [
  colors.primary,
  colors.green,
  colors.amber,
  colors.purple,
  '#ff5252', // coral
  '#ffd600', // yellow
] as const

function slugToColour(slug: string): string {
  let hash = 2166136261
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return GALLERY_COLOURS[Math.abs(hash) % GALLERY_COLOURS.length]
}

export const Gallery: React.FC = () => {
  const navigate = useNavigate()

  const [items, setItems] = useState<GallerySummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fatal, setFatal] = useState<{ status: number | null } | null>(null)

  const [sort, setSort] = useState<GallerySort>('recent')
  const [tag, setTag] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [sort, tag, search])

  const requestIdRef = useRef(0)

  const load = useCallback(
    async (pageToLoad: number) => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setError(null)
      setFatal(null)
      try {
        const result = await fetchGallery({
          sort,
          tag: tag ?? undefined,
          search: search || undefined,
          page: pageToLoad,
          limit: PAGE_SIZE,
        })
        if (requestId !== requestIdRef.current) return
        setTotal(result.total)
        setItems((prev) => (pageToLoad === 1 ? result.data : [...prev, ...result.data]))
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        if (err instanceof ApiError && (err.isNetwork || (err.status ?? 0) >= 500)) {
          setFatal({ status: err.status })
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to load gallery')
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [sort, tag, search],
  )

  useEffect(() => {
    load(page)
  }, [load, page])

  const handleTagClick = (clicked: string) => {
    setTag((current) => (current === clicked ? null : clicked))
  }

  const hasMore = items.length < total

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FilterBar
        sort={sort}
        onSortChange={setSort}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        tag={tag}
        onClearTag={() => setTag(null)}
      />

      <ResultsMeta items={items.length} total={total} loading={loading} />

      {fatal && <FatalError source="/gallery" status={fatal.status} onRetry={() => load(page)} />}

      {!fatal && error && (
        <div style={{ color: colors.red, fontFamily: fonts.mono, fontSize: 12, padding: 16 }}>
          {error}
        </div>
      )}

      {!fatal && !error && items.length === 0 && !loading && (
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
          <div>No configs match these filters.</div>
        </div>
      )}

      {items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {items.map((item) => (
            <GalleryCard
              key={item.slug}
              item={item}
              onOpen={() => navigate(`/s/${item.slug}`)}
              onTagClick={handleTagClick}
              activeTag={tag}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 24px' }}>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              color: loading ? colors.textMuted : colors.primary,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: fonts.mono,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {loading ? 'LOADING...' : 'LOAD MORE'}
          </button>
        </div>
      )}
    </div>
  )
}

const FilterBar: React.FC<{
  sort: GallerySort
  onSortChange: (s: GallerySort) => void
  searchInput: string
  onSearchChange: (v: string) => void
  tag: string | null
  onClearTag: () => void
}> = ({ sort, onSortChange, searchInput, onSearchChange, tag, onClearTag }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
    }}
  >
    <input
      type="text"
      placeholder="Search titles..."
      value={searchInput}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{
        flex: '1 1 200px',
        padding: '6px 10px',
        background: colors.cardBackground,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        color: colors.textPrimary,
        fontFamily: fonts.mono,
        fontSize: 12,
        outline: 'none',
      }}
    />

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {SORT_OPTIONS.map((opt) => (
        <SortPill
          key={opt.value}
          label={opt.label}
          active={sort === opt.value}
          onClick={() => onSortChange(opt.value)}
        />
      ))}
    </div>

    {tag && (
      <button
        onClick={onClearTag}
        title="Clear tag filter"
        style={{
          padding: '5px 10px',
          background: `${colors.primary}15`,
          border: `1px solid ${colors.primary}`,
          borderRadius: 5,
          color: colors.primary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}
      >
        TAG: {tag} ✕
      </button>
    )}
  </div>
)

const SortPill: React.FC<{
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

const ResultsMeta: React.FC<{ items: number; total: number; loading: boolean }> = ({
  items,
  total,
  loading,
}) => {
  if (loading && total === 0) {
    return (
      <div style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 11 }}>
        Loading gallery...
      </div>
    )
  }
  if (total === 0) return null
  return (
    <div style={{ color: colors.textMuted, fontFamily: fonts.mono, fontSize: 11 }}>
      Showing {items} of {total}
    </div>
  )
}

const GalleryCard: React.FC<{
  item: GallerySummary
  onOpen: () => void
  onTagClick: (tag: string) => void
  activeTag: string | null
}> = ({ item, onOpen, onTagClick, activeTag }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 0,
        background: colors.cardBackground,
        border: `1px solid ${hovered ? colors.borderHover : colors.border}`,
        borderRadius: 8,
        fontFamily: fonts.mono,
        transition: 'border-color 0.12s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CardThumbnail accent={slugToColour(item.slug)} height={110} count={item.forkCount}>
        <CounterOverlay views={item.viewCount} forks={item.forkCount} />
      </CardThumbnail>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </div>

        <div
          style={{
            color: colors.textMuted,
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {item.author && <AuthorAvatar username={item.author.username} />}
          {item.author && <span>@{item.author.username}</span>}
          <span>{formatDate(item.createdAt)}</span>
        </div>

        {item.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.tags.map((t) => {
              const isActive = activeTag === t
              return (
                <span
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation()
                    onTagClick(t)
                  }}
                  style={{
                    padding: '2px 8px',
                    background: isActive ? `${colors.primary}20` : 'rgba(255, 152, 0, 0.06)',
                    border: `1px solid ${isActive ? colors.primary : colors.border}`,
                    borderRadius: 10,
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontSize: 9,
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </span>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <ForkButton
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
          />
        </div>
      </div>
    </div>
  )
}

const ForkButton: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        background: hovered ? `${colors.primary}15` : 'transparent',
        border: `1px solid ${hovered ? colors.primary : colors.border}`,
        borderRadius: 5,
        color: hovered ? colors.primary : colors.textSecondary,
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'all 0.12s',
      }}
    >
      <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 3a3 3 0 00-1 5.83v6.34a3.001 3.001 0 102 0V15a2 2 0 002-2V9h3.17a3.001 3.001 0 100-2H9v6a4 4 0 01-4 4v.17A3.001 3.001 0 006 3z" />
      </svg>
      FORK
    </button>
  )
}

const CounterOverlay: React.FC<{
  views: number
  forks: number
}> = ({ views, forks }) => (
  <div
    style={{
      position: 'absolute',
      top: 6,
      right: 6,
      display: 'flex',
      gap: 6,
      pointerEvents: 'none',
    }}
  >
    <CounterChip icon="eye" value={views} />
    <CounterChip icon="fork" value={forks} />
  </div>
)

const CounterChip: React.FC<{
  icon: 'eye' | 'fork'
  value: number
}> = ({ icon, value }) => (
  <span
    aria-label={`${value} ${icon === 'eye' ? 'views' : 'forks'}`}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '2px 6px',
      background: 'rgba(13, 17, 23, 0.75)',
      border: `1px solid ${colors.border}`,
      borderRadius: 3,
      fontSize: 9,
      color: colors.textSecondary,
      letterSpacing: '0.06em',
    }}
  >
    {icon === 'eye' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5C21.3 7.6 17 4.5 12 4.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z" />
      </svg>
    ) : (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 3a3 3 0 00-1 5.83v6.34a3.001 3.001 0 102 0V15a2 2 0 002-2V9h3.17a3.001 3.001 0 100-2H9v6a4 4 0 01-4 4v.17A3.001 3.001 0 006 3z" />
      </svg>
    )}
    {value}
  </span>
)

const AuthorAvatar: React.FC<{ username: string }> = ({ username }) => (
  <div
    aria-hidden
    style={{
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'rgba(255, 152, 0, 0.08)',
      border: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 8,
      color: colors.primary,
      fontWeight: 700,
      letterSpacing: 0,
      flexShrink: 0,
    }}
  >
    {username.slice(0, 2).toUpperCase()}
  </div>
)
