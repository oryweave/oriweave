import React from 'react'
import { AppNav } from '../components/AppNav'
import { Gallery } from '../components/Gallery'

const colors = {
  background: '#0D1117',
}

const fonts = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
}

export const GalleryPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        fontFamily: fonts.mono,
      }}
    >
      <AppNav title="GALLERY" kicker="// what the community is running" />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 24,
        }}
      >
        <Gallery />
      </div>
    </div>
  )
}
