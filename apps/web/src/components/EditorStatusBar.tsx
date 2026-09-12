import React from 'react'
import type { ValidationError } from '@oriweave/core'

interface EditorStatusBarProps {
  networkCount: number
  deviceCount: number
  connectionCount: number
  errors: ValidationError[]
  currentLine: number
}

const colors = {
  border: 'rgba(0, 229, 255, 0.12)',
  red: '#ff1744',
  amber: '#ffab00',
  green: '#00e676',
  textMuted: '#455a64',
}

type Status = 'valid' | 'warning' | 'invalid'

function deriveStatus(errors: ValidationError[]): Status {
  if (errors.some((e) => e.severity === 'error')) return 'invalid'
  if (errors.length > 0) return 'warning'
  return 'valid'
}

const STATUS_COLOR: Record<Status, string> = {
  valid: colors.green,
  warning: colors.amber,
  invalid: colors.red,
}

const STATUS_LABEL: Record<Status, string> = {
  valid: 'VALID',
  warning: 'VALID',
  invalid: 'INVALID',
}

/**
 * Footer status bar inside the YAML editor pane.
 *
 *   [LED] VALID · N NETWORKS · N DEVICES · N CONNECTIONS      YAML · UTF-8 · LF · LINE n
 *
 * LED tone follows error severity: green (valid), amber (warnings only),
 * red (any error).
 */
export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  networkCount,
  deviceCount,
  connectionCount,
  errors,
  currentLine,
}) => {
  const status = deriveStatus(errors)
  const ledColor = STATUS_COLOR[status]
  const statusLabel = STATUS_LABEL[status]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderTop: `1px solid ${colors.border}`,
        padding: '6px 14px',
        fontSize: 9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: colors.textMuted,
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-label={`status ${status}`}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: ledColor,
            boxShadow: `0 0 6px ${ledColor}`,
            flexShrink: 0,
          }}
        />
        <span>{statusLabel}</span>
        <Separator />
        <span>
          {networkCount} {pluralize('NETWORK', networkCount)}
        </span>
        <Separator />
        <span>
          {deviceCount} {pluralize('DEVICE', deviceCount)}
        </span>
        <Separator />
        <span>
          {connectionCount} {pluralize('CONNECTION', connectionCount)}
        </span>
      </div>

      <div>YAML · UTF-8 · LF · LINE {currentLine}</div>
    </div>
  )
}

const Separator: React.FC = () => (
  <span style={{ opacity: 0.5 }} aria-hidden="true">
    ·
  </span>
)

function pluralize(word: string, n: number): string {
  return n === 1 ? word : `${word}S`
}
