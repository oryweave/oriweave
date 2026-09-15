import React from 'react'
import { colors, fonts } from '@oriweave/renderer'
import { AppNav } from '../components/AppNav'
import { Gallery } from '../components/Gallery'
import { PageHero } from '../components/PageHero'

export const GalleryPage: React.FC = () => {
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
          eyebrow="── COMMUNITY GALLERY"
          title="Real homelabs, forkable as YAML."
          subtitle="Published configs from r/homelab. Fork one, swap the hostnames, keep the wiring."
        />
        <Gallery />
      </div>
    </div>
  )
}
