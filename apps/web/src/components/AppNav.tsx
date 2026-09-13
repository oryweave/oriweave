import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { colors, fonts, Logomark } from '@oriweave/renderer'
import { fetchGithubStats } from '../lib/api'
import { UserMenu } from './UserMenu'

const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://oriweave.localhost:3001'

const APP_ENV = import.meta.env.VITE_APP_ENV

interface AppNavProps {
  title?: string
  kicker?: string
  primaryAction?: React.ReactNode
}

// Environment-aware branding: a red corner ribbon over the logo for any
// non-production environment, in place of the old `document.title`
// suffix (title mutation removed from main.tsx). Never renders in prod.
const EnvRibbon: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!APP_ENV || APP_ENV === 'production') return <>{children}</>

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
      title={`Running in ${APP_ENV}`}
    >
      {children}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -5,
          right: -11,
          transform: 'rotate(24deg)',
          background: colors.red,
          color: colors.background,
          fontFamily: fonts.mono,
          fontSize: 6,
          fontWeight: 700,
          letterSpacing: '0.03em',
          lineHeight: 1,
          padding: '1px 3px',
          borderRadius: 2,
          whiteSpace: 'nowrap',
          boxShadow: `0 0 4px ${colors.red}99`,
        }}
      >
        {APP_ENV.slice(0, 4).toUpperCase()}
      </span>
    </div>
  )
}

const NavLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const active = location.pathname === to

  return (
    <button
      onClick={() => navigate(to)}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = colors.primary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? colors.primary : colors.textSecondary
      }}
      style={{
        background: 'transparent',
        border: 'none',
        color: active ? colors.primary : colors.textSecondary,
        fontFamily: fonts.mono,
        fontSize: 11,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        padding: '4px 0',
      }}
    >
      {children}
    </button>
  )
}

const ExternalNavLink: React.FC<{ href: string; title?: string; children: React.ReactNode }> = ({
  href,
  title,
  children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    title={title}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = colors.primary
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = colors.textSecondary
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      color: colors.textSecondary,
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      padding: '4px 0',
    }}
  >
    {children}
  </a>
)

// Plain same-tab anchor for destinations outside the SPA's router (e.g. the docs site,
// served on its own subdomain) — a react-router NavLink would try to client-side navigate
// to a route that doesn't exist.
const SiteLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = colors.primary
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = colors.textSecondary
    }}
    style={{
      color: colors.textSecondary,
      fontFamily: fonts.mono,
      fontSize: 11,
      letterSpacing: '0.04em',
      textDecoration: 'none',
      padding: '4px 0',
    }}
  >
    {children}
  </a>
)

// Octocat glyph — matches the icon UserMenu already uses for the GitHub OAuth button.
const GithubIcon: React.FC = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.2-.1-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.7-5.5 6 .5.4.9 1.1.9 2.3v3.4c0 .3.2.7.8.6A12 12 0 0012 .3" />
  </svg>
)

const DefaultNewDiagramButton: React.FC = () => {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => navigate('/editor')}
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
      NEW DIAGRAM
    </button>
  )
}

const GITHUB_URL = 'https://github.com/oryweave/oriweave'

// Compact numeric formatting for the star/fork counts (1234 -> "1.2k"), keeps the pill from
// pushing the header layout around once real counts come in.
function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
}

// Matches the "5.1 — LANDING" top-bar spec in the StackDoc design canvas
// (claude.ai/design, project "StackDoc" — Design Direction.html / pages.jsx / LandingMock),
// pulled 2026-08-19. Octocat + star-count pill, divider, fork-count — same icon paths as the
// mock, not the plain nav GithubIcon above.
const GithubStatsPill: React.FC<{ stars: number; forks: number }> = ({ stars, forks }) => (
  <a
    href={GITHUB_URL}
    target="_blank"
    rel="noopener noreferrer"
    title="github"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 10px',
      background: 'rgba(255, 255, 255, 0.06)',
      border: `1px solid ${colors.border}`,
      borderRadius: 5,
      textDecoration: 'none',
    }}
  >
    <svg width={16} height={16} viewBox="0 0 16 16" fill={colors.textPrimary} aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        color: colors.textPrimary,
        fontWeight: 600,
      }}
    >
      <svg width={11} height={11} viewBox="0 0 16 16" fill={colors.amber} aria-hidden>
        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
      </svg>
      {formatCount(stars)}
    </span>
    <span style={{ width: 1, height: 12, background: colors.border }} />
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        color: colors.textSecondary,
      }}
    >
      <svg width={11} height={11} viewBox="0 0 24 24" fill={colors.textSecondary} aria-hidden>
        <path d="M9 3a3 3 0 00-1 5.83V12H6.5A2.5 2.5 0 014 9.5V8.83a3 3 0 10-2 0v.67A4.5 4.5 0 006.5 14H10v2.17a3 3 0 102 0V8.83A3 3 0 009 3z" />
      </svg>
      {formatCount(forks)}
    </span>
  </a>
)

// Fetches stats and swaps in the pill once loaded; falls back to the plain octocat link
// (PR #76 state) on null/unavailable — no design spec exists for that state, so it stays as-is.
const GithubNavItem: React.FC = () => {
  const [stats, setStats] = useState<{ stars: number; forks: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchGithubStats().then((result) => {
      if (cancelled || !result || result.stars === null || result.forks === null) return
      setStats({ stars: result.stars, forks: result.forks })
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (stats) return <GithubStatsPill stars={stats.stars} forks={stats.forks} />

  return (
    <ExternalNavLink href={GITHUB_URL} title="github">
      <GithubIcon />
    </ExternalNavLink>
  )
}

export const AppNav: React.FC<AppNavProps> = ({ title, kicker, primaryAction }) => (
  <header
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      padding: '14px 28px',
      borderBottom: `1px solid ${colors.border}`,
      background: 'rgba(13, 17, 23, 0.92)',
      backdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}
  >
    {/* Brand — anchor, not navigate(), so middle-click opens a new tab. */}
    <a
      href="/"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
        color: colors.textPrimary,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      <EnvRibbon>
        <Logomark variant="full" live style={{ width: 28, height: 28, flexShrink: 0 }} />
      </EnvRibbon>
      oriweave
    </a>

    <span
      style={{
        padding: '2px 6px',
        border: `1px solid ${colors.green}40`,
        borderRadius: 3,
        color: colors.green,
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.1em',
      }}
    >
      LIVE
    </span>

    {title && (
      <span
        style={{
          color: colors.textPrimary,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </span>
    )}

    {kicker && (
      <span
        style={{
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: 0,
        }}
      >
        {kicker}
      </span>
    )}

    <div style={{ flex: 1 }} />

    <nav style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
      <GithubNavItem />
      <NavLink to="/templates">templates</NavLink>
      <NavLink to="/gallery">gallery</NavLink>
      <SiteLink href={DOCS_URL}>docs</SiteLink>
    </nav>

    {primaryAction ?? <DefaultNewDiagramButton />}

    <UserMenu />
  </header>
)
