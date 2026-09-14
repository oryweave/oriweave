import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors as tokenColors, fonts, radii, motion } from '@oriweave/renderer'
import { useAuth } from '../context/AuthContext'

// Local alpha-blended variant of the surface token, for the backdrop-blur dropdown.
const colors = { ...tokenColors, background: 'rgba(22, 27, 34, 0.95)' }

const githubIcon = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.2-.1-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.7-5.5 6 .5.4.9 1.1.9 2.3v3.4c0 .3.2.7.8.6A12 12 0 0012 .3" />
  </svg>
)

export const UserMenu: React.FC = () => {
  const { user, isLoading, isLoggedIn, login, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  if (isLoading) {
    return <div style={{ width: 32, height: 32 }} aria-hidden />
  }

  if (!isLoggedIn || !user) {
    return (
      <button
        onClick={login}
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
          borderRadius: radii.md,
          color: colors.textSecondary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          transition: `all ${motion.fast}`,
        }}
      >
        {githubIcon}
        SIGN IN
      </button>
    )
  }

  const handleMyConfigs = () => {
    setOpen(false)
    navigate('/my-configs')
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase()

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      {/* Oriweave has no local accounts — the chip always reflects a connected git host.
          Only GitHub OAuth is wired up today; the provider-dot badge is ready for the
          others once they exist. */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={`${user.username} · github`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '3px 9px 3px 3px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${open ? colors.borderHover : colors.border}`,
          borderRadius: radii.pill,
          cursor: 'pointer',
          transition: `border-color ${motion.fast}`,
        }}
      >
        <span style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${tokenColors.primary}, ${tokenColors.primaryDeep})`,
            }}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <span
                style={{
                  color: '#08121f',
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {initial}
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: '#e6edf3',
              border: `1.5px solid ${tokenColors.background}`,
            }}
          />
        </span>
        <span style={{ fontSize: 11, color: colors.textPrimary, fontFamily: fonts.mono }}>
          {user.username}
        </span>
        <svg width={9} height={9} viewBox="0 0 16 16" style={{ marginLeft: -2 }} aria-hidden>
          <path
            d="M4 6l4 4 4-4"
            stroke={colors.textMuted}
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            minWidth: 200,
            padding: 8,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: radii.lg,
            backdropFilter: 'blur(12px)',
            zIndex: 30,
          }}
        >
          <div
            style={{
              padding: '6px 10px 10px',
              borderBottom: `1px solid ${colors.border}`,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                color: colors.textPrimary,
                fontFamily: fonts.mono,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.displayName || user.username}
            </div>
            <div
              style={{
                color: colors.textMuted,
                fontFamily: fonts.mono,
                fontSize: 10,
                marginTop: 2,
              }}
            >
              @{user.username}
            </div>
          </div>

          <MenuItem onClick={handleMyConfigs} label="My Configs" />
          <MenuItem onClick={handleLogout} label="Logout" danger />
        </div>
      )}
    </div>
  )
}

const MenuItem: React.FC<{ onClick: () => void; label: string; danger?: boolean }> = ({
  onClick,
  label,
  danger,
}) => {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 10px',
        background: hovered ? 'rgba(255, 152, 0, 0.06)' : 'transparent',
        border: 'none',
        borderRadius: radii.sm,
        color: danger ? colors.red : hovered ? colors.primary : colors.textPrimary,
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 11,
        fontWeight: 600,
        textAlign: 'left',
        transition: `all ${motion.fast}`,
      }}
    >
      {label}
    </button>
  )
}
