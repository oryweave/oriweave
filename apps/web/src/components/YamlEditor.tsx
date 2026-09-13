import React, { useState } from 'react'
import type { ValidationError } from '@oriweave/core'
import { CodeMirrorEditor } from './CodeMirrorEditor'
import { EditorStatusBar } from './EditorStatusBar'

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
  errors: ValidationError[]
  networkCount: number
  deviceCount: number
  connectionCount: number
}

const colors = {
  border: 'rgba(38, 198, 218, 0.12)',
  red: '#ff1744',
  amber: '#FF9800',
  green: '#00e676',
  textSecondary: '#8B949E',
}

export const YamlEditor: React.FC<YamlEditorProps> = ({
  value,
  onChange,
  errors,
  networkCount,
  deviceCount,
  connectionCount,
}) => {
  const errorCount = errors.filter((e) => e.severity === 'error').length
  const warningCount = errors.filter((e) => e.severity === 'warning').length
  const [currentLine, setCurrentLine] = useState(1)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#06090f',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: `1px solid ${colors.border}`,
          fontSize: 10,
          color: colors.textSecondary,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          homelab.yaml
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          {errorCount > 0 && (
            <span style={{ color: colors.red }}>
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span style={{ color: colors.amber }}>
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
          {errorCount === 0 && warningCount === 0 && (
            <span style={{ color: colors.green }}>valid</span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <CodeMirrorEditor value={value} onChange={onChange} onCursorChange={setCurrentLine} />
      </div>

      {/* Error panel */}
      {errors.length > 0 && (
        <div
          style={{
            maxHeight: 100,
            overflowY: 'auto',
            borderTop: `1px solid ${colors.border}`,
            padding: '6px 16px',
            fontSize: 10,
            flexShrink: 0,
          }}
        >
          {errors.map((err, i) => (
            <div
              key={i}
              style={{
                color: err.severity === 'error' ? colors.red : colors.amber,
                marginBottom: 3,
              }}
            >
              <span style={{ opacity: 0.5 }}>{err.path || 'root'}</span> {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Footer status bar */}
      <EditorStatusBar
        networkCount={networkCount}
        deviceCount={deviceCount}
        connectionCount={connectionCount}
        errors={errors}
        currentLine={currentLine}
      />
    </div>
  )
}
