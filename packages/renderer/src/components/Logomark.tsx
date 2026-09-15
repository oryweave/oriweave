import React, { useMemo } from 'react'
import { colors } from '../theme'
import { MARK, DRAW_ORDER, AMBER_STRAND } from '../logomarkData'

interface CableProps {
  p: (typeof MARK.paths)[number]
  casing: string
  mono?: string
  weight: number
  live?: boolean
  liveClassName?: string
}

const Cable: React.FC<CableProps> = ({ p, casing, mono, weight, live, liveClassName }) => {
  const w = p.w * weight
  const col = mono || p.c
  return (
    <>
      <path
        d={p.d}
        fill="none"
        stroke={casing}
        strokeWidth={w + 3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={p.d}
        fill="none"
        stroke={col}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {live && (
        <path
          d={p.d}
          fill="none"
          stroke={mono || colors.amberLight}
          strokeWidth={w * 0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={liveClassName}
        />
      )}
    </>
  )
}

const Plug: React.FC<{
  plug?: { x: number; y: number; ang: number }
  casing: string
  mono?: string
}> = ({ plug, casing, mono }) => {
  if (!plug) return null
  const body = mono || colors.amber
  const pin = mono || colors.amberLight
  return (
    <g transform={`translate(${plug.x},${plug.y}) rotate(${plug.ang})`}>
      <rect
        x="-11.6"
        y="-7.6"
        width="21.6"
        height="15.2"
        rx="2.2"
        fill={casing}
        stroke={body}
        strokeWidth="2.4"
      />
      <path
        d="M-4.2 -7.6 h8.2 v-3.8 h-8.2 z"
        fill={casing}
        stroke={body}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={-7.6 + i * 3.3}
          y="-4.7"
          width="1.4"
          height="4"
          rx="0.6"
          fill={pin}
          opacity="0.85"
        />
      ))}
    </g>
  )
}

interface LogomarkProps {
  /** full = seven-strand weave with the RJ45 connector. reduced = three strands, for 24px and below. */
  variant?: 'full' | 'reduced'
  /** Collapse every strand to one color — single-color print, light grounds, knockout. */
  mono?: string
  /** Color the casing gaps are painted — must match whatever surface the mark sits on. */
  casing?: string
  /** Stroke multiplier. */
  weight?: number
  /** Slow amber trace along the emerging cable. Site header only, per the design system. */
  live?: boolean
  /** Accessible label. */
  title?: string
  style?: React.CSSProperties
  className?: string
}

let uid = 0

export const Logomark: React.FC<LogomarkProps> = ({
  variant = 'full',
  mono,
  casing = colors.background,
  weight = 1,
  live = false,
  title = 'Oriweave',
  style,
  className,
}) => {
  const id = useMemo(() => `om${uid++}`, [])
  const paths = variant === 'reduced' ? MARK.reduce : DRAW_ORDER.map((i) => MARK.paths[i])
  const amberPath = MARK.paths[AMBER_STRAND]

  return (
    <svg
      viewBox={MARK.vb}
      role="img"
      aria-label={title}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', ...style }}
    >
      {variant === 'full' && (
        <defs>
          <clipPath id={`${id}-x`}>
            <circle cx="72" cy="56" r="20" />
            <circle cx="162" cy="104" r="18" />
          </clipPath>
          {live && (
            <style>{`
              .om-live-${id} { stroke-dasharray: 28 320; animation: om-trace-${id} 9s linear infinite; }
              @keyframes om-trace-${id} { to { stroke-dashoffset: -348; } }
              @media (prefers-reduced-motion: reduce) {
                .om-live-${id} { animation: none; stroke-dasharray: none; }
              }
            `}</style>
          )}
        </defs>
      )}
      {paths.map((p, i) => (
        <Cable
          key={i}
          p={p}
          casing={casing}
          mono={mono}
          weight={weight}
          live={live && variant === 'full' && p === amberPath}
          liveClassName={`om-live-${id}`}
        />
      ))}
      {variant === 'full' && (
        <g clipPath={`url(#${id}-x)`}>
          <Cable p={MARK.paths[0]} casing={casing} mono={mono} weight={weight} />
          <Cable p={MARK.paths[6]} casing={casing} mono={mono} weight={weight} />
        </g>
      )}
      {variant === 'full' && <Plug plug={amberPath.plug} casing={casing} mono={mono} />}
    </svg>
  )
}
