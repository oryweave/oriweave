import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const colors = {
  background: 'rgba(22, 27, 34, 0.95)',
  border: 'rgba(38, 198, 218, 0.12)',
  borderHover: 'rgba(38, 198, 218, 0.35)',
  primary: '#26C6DA',
  textPrimary: '#E0E0E0',
  textSecondary: '#8B949E',
  textMuted: '#6E7681',
  red: '#ff1744',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

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
          borderRadius: 6,
          color: colors.textSecondary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          transition: 'all 0.15s',
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
      <button
        onClick={() => setOpen((v) => !v)}
        title={user.username}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          border: `1px solid ${open ? colors.borderHover : colors.border}`,
          background: colors.background,
          padding: 0,
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.15s',
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
              color: colors.textPrimary,
              fontFamily: fonts.mono,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {initial}
          </span>
        )}
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
            borderRadius: 8,
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
        background: hovered ? 'rgba(38, 198, 218, 0.06)' : 'transparent',
        border: 'none',
        borderRadius: 4,
        color: danger ? colors.red : hovered ? colors.primary : colors.textPrimary,
        cursor: 'pointer',
        fontFamily: fonts.mono,
        fontSize: 11,
        fontWeight: 600,
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}
