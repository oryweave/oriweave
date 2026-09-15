import React, { useState, useRef, useEffect } from 'react'
import { colors as tokenColors, fonts } from '@oriweave/renderer'

// Local alpha-blended variant of the surface token, matching SharePanel's dropdown.
const colors = { ...tokenColors, background: 'rgba(22, 27, 34, 0.95)' }

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'S'], label: 'Re-render the topology' },
  { keys: ['Ctrl', 'E'], label: 'Toggle the editor pane' },
  { keys: ['Ctrl', 'Shift', 'P'], label: 'Export as PNG' },
]

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? '')

const keyLabel = (key: string): string => (key === 'Ctrl' && isMac ? 'Cmd' : key)

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd
    style={{
      padding: '2px 6px',
      background: 'rgba(255, 255, 255, 0.04)',
      border: `1px solid ${colors.border}`,
      borderRadius: 4,
      color: colors.textPrimary,
      fontFamily: fonts.mono,
      fontSize: 10,
      fontWeight: 600,
    }}
  >
    {children}
  </kbd>
)

export const KeyboardShortcutsPanel: React.FC = () => {
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

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(!open)}
        title="Keyboard shortcuts"
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
          justifyContent: 'center',
          width: 28,
          height: 28,
          background: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          color: colors.textSecondary,
          cursor: 'pointer',
          fontFamily: fonts.mono,
          fontSize: 12,
          fontWeight: 700,
          transition: 'all 0.12s',
        }}
      >
        ?
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 0,
            zIndex: 30,
            width: 240,
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
          <div
            style={{
              fontSize: 9,
              color: colors.textMuted,
              letterSpacing: '0.1em',
              fontWeight: 700,
              padding: '2px 4px 4px',
            }}
          >
            KEYBOARD SHORTCUTS
          </div>

          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '6px 4px',
              }}
            >
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textPrimary }}>
                {shortcut.label}
              </span>
              <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={key}>
                    {i > 0 && <span style={{ color: colors.textMuted, fontSize: 10 }}>+</span>}
                    <Kbd>{keyLabel(key)}</Kbd>
                  </React.Fragment>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
