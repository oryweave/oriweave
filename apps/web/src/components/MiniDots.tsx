import React from 'react'

/**
 * Generic preview glyph used in card thumbnails. Same topology for every
 * config — only the stroke colour of the top row changes. The bottom row is
 * always green to evoke "services running."
 *
 * Per-card visual variety is deferred to a future phase that can render real
 * previews from each config's YAML.
 */
export const MiniDots: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 200 120"
    preserveAspectRatio="none"
    style={{ display: 'block' }}
  >
    <line
      x1="20"
      y1="30"
      x2="180"
      y2="30"
      stroke={color}
      strokeWidth="0.5"
      strokeDasharray="2 3"
      opacity="0.5"
    />
    <line x1="100" y1="30" x2="100" y2="90" stroke={color} strokeWidth="0.5" opacity="0.5" />
    <line x1="40" y1="90" x2="160" y2="90" stroke={color} strokeWidth="0.5" opacity="0.5" />
    {[30, 80, 130, 170].map((x, i) => (
      <g key={`top-${i}`}>
        <rect
          x={x - 12}
          y={20}
          width="24"
          height="20"
          rx="2"
          fill="rgba(22, 27, 34, 0.6)"
          stroke={color}
          strokeWidth="0.5"
        />
        <circle cx={x} cy="30" r="2" fill={color} />
      </g>
    ))}
    {[40, 80, 120, 160].map((x, i) => (
      <rect
        key={`bot-${i}`}
        x={x - 10}
        y={80}
        width="20"
        height="14"
        rx="1.5"
        fill="rgba(22, 27, 34, 0.6)"
        stroke="#00e676"
        strokeWidth="0.4"
      />
    ))}
  </svg>
)
