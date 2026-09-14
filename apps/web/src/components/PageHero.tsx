import React from 'react'
import { colors, fonts } from '@oriweave/renderer'

interface PageHeroProps {
  eyebrow: string
  title: string
  subtitle: string
}

// In-page section header for browse-style pages (Gallery, Templates) — the design puts page
// identity here, not in the top nav bar, so AppNav's title/kicker props are unused on these pages.
export const PageHero: React.FC<PageHeroProps> = ({ eyebrow, title, subtitle }) => (
  <div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: colors.primary,
        fontFamily: fonts.mono,
      }}
    >
      {eyebrow}
    </div>
    <h1
      style={{
        fontFamily: fonts.sans,
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: '-0.018em',
        color: colors.textPrimary,
        margin: '8px 0 6px',
      }}
    >
      {title}
    </h1>
    <p
      style={{
        fontFamily: fonts.sans,
        fontSize: 13.5,
        color: colors.textSecondary,
        lineHeight: 1.65,
        maxWidth: '58ch',
        margin: 0,
      }}
    >
      {subtitle}
    </p>
  </div>
)
