import React from 'react'
import { ALL_LAYERS, type LayerCategory } from '../lib/layers'
import { colors, fonts } from '../theme'

interface DensityToolbarProps {
  enabledLayers: ReadonlySet<LayerCategory>
  zoomPercent: number
  focusActive: boolean
  onToggleLayer: (layer: LayerCategory) => void
  onSetZoom: (zoomPercent: number) => void
  onFocus: () => void
}

const ZOOM_LEVELS = [25, 50, 75, 100, 150] as const

const Chip: React.FC<{
  active: boolean
  onClick: () => void
  children: React.ReactNode
  activeColor?: string
  title?: string
}> = ({ active, onClick, children, activeColor, title }) => {
  const [hovered, setHovered] = React.useState(false)
  const accent = activeColor ?? colors.primary

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        background: active ? `${accent}22` : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? accent : hovered ? colors.borderHover : colors.border}`,
        borderRadius: 4,
        color: active ? accent : hovered ? colors.textPrimary : colors.textSecondary,
        fontFamily: fonts.mono,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '4px 8px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </button>
  )
}

const Divider: React.FC = () => (
  <span style={{ width: 1, height: 14, background: colors.border, display: 'inline-block' }} />
)

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      fontSize: 8,
      color: colors.textMuted,
      fontFamily: fonts.mono,
      letterSpacing: '0.08em',
      fontWeight: 700,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </span>
)

/**
 * Canvas-level density toolbar. Three sections, left → right:
 *   - Layer toggles (ETH / WIFI / VPN / STORAGE) — each chip flips the
 *     visibility of edges in its category.
 *   - Zoom shortcuts (25 / 50 / 75 / 100 / 150 %) — clicking sets the
 *     canvas zoom.
 *   - Focus chip (`F`) — equivalent to pressing the F key on the keyboard.
 *
 * State is fully controlled — the toolbar owns no internal state of its
 * own. `TopologyCanvas` is the source of truth.
 */
export const DensityToolbar: React.FC<DensityToolbarProps> = ({
  enabledLayers,
  onToggleLayer,
  zoomPercent,
  onSetZoom,
  focusActive,
  onFocus,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        right: 16,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        background: 'rgba(22, 27, 34, 0.92)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        fontFamily: fonts.mono,
        pointerEvents: 'auto',
      }}
    >
      <SectionLabel>LAYERS</SectionLabel>
      <div style={{ display: 'flex', gap: 4 }}>
        {ALL_LAYERS.map((layer) => (
          <Chip
            key={layer}
            active={enabledLayers.has(layer)}
            onClick={() => onToggleLayer(layer)}
            title={`Toggle ${layer} layer`}
          >
            {layer}
          </Chip>
        ))}
      </div>

      <Divider />

      <SectionLabel>ZOOM</SectionLabel>
      <div style={{ display: 'flex', gap: 4 }}>
        {ZOOM_LEVELS.map((z) => (
          <Chip
            key={z}
            active={zoomPercent === z}
            onClick={() => onSetZoom(z)}
            title={`Zoom to ${z}%`}
          >
            {z}%
          </Chip>
        ))}
      </div>

      <Divider />

      <Chip
        active={focusActive}
        onClick={onFocus}
        activeColor={colors.amber}
        title="Focus mode (F)"
      >
        F&nbsp;&nbsp;FOCUS
      </Chip>
    </div>
  )
}
