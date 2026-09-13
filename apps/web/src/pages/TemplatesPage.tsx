import React from 'react'
import { AppNav } from '../components/AppNav'
import { Templates } from '../components/Templates'

const colors = {
  background: '#0D1117',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

export const TemplatesPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        fontFamily: fonts.mono,
      }}
    >
      <AppNav title="TEMPLATES" />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 24,
        }}
      >
        <Templates />
      </div>
    </div>
  )
}
