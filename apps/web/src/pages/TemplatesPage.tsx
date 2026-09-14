import React from 'react'
import { colors, fonts } from '@oriweave/renderer'
import { AppNav } from '../components/AppNav'
import { PageHero } from '../components/PageHero'
import { Templates } from '../components/Templates'

export const TemplatesPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        fontFamily: fonts.mono,
      }}
    >
      <AppNav />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '28px 24px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <PageHero
          eyebrow="── TEMPLATES"
          title="Start from a known-good topology."
          subtitle="Every template is a YAML file you own after forking. Nothing is locked to the renderer."
        />
        <Templates />
      </div>
    </div>
  )
}
