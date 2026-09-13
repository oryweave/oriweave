import React, { useEffect, useRef, useState } from 'react'
import { colors, fonts, deviceAccent } from '../theme'
import type { PositionedGraph } from '@oriweave/core'

interface MinimapProps {
  graph: PositionedGraph
  transform: { x: number; y: number; scale: number }
  setTransform: (t: { x: number; y: number; scale: number }) => void
  containerWidth: number
  containerHeight: number
}

const MINIMAP_W = 180
const MINIMAP_H = 120
const PADDING = 8
const PROXIMITY_PX = 80
const DOT_RADIUS = 1.5

/**
 * Bottom-right overview pane. Renders:
 *   - One coloured dot per device (`deviceAccent` for the colour).
 *   - A dashed cyan viewport rectangle showing the part of the canvas
 *     currently visible.
 *   - A "MINIMAP" caption.
 *
 * Interactions:
 *   - Click anywhere → recentre the canvas viewport on that point.
 *   - Drag the viewport rectangle → pan the canvas in lockstep.
 *
 * Visibility:
 *   - Hidden entirely when the viewport is < 800px wide (spec).
 *   - Auto-fades to 40% opacity when the mouse is > 80px away (rect-
 *     based distance, not radial), rises to 100% otherwise.
 *
 * Data source: derived directly from `PositionedGraph` — no parallel
 * cache. Per the handoff: "the minimap is a thin view, not a parallel
 * pipeline."
 */
export const Minimap: React.FC<MinimapProps> = ({
  graph,
  transform,
  setTransform,
  containerWidth,
  containerHeight,
}) => {
  const minimapRef = useRef<HTMLDivElement>(null)
  const [nearby, setNearby] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ dx: 0, dy: 0 })

  // Track proximity globally so the minimap fades up before the cursor
  // even enters it. Rect distance (not radial), per spec.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = minimapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
      setNearby(dx <= PROXIMITY_PX && dy <= PROXIMITY_PX)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Inner drawable area (padding-adjusted).
  const innerW = MINIMAP_W - PADDING * 2
  const innerH = MINIMAP_H - PADDING * 2

  // Fit canvas bounds into the inner area, preserving aspect.
  const scaleX = innerW / graph.bounds.width
  const scaleY = innerH / graph.bounds.height
  const minimapScale = Math.min(scaleX, scaleY)
  const drawnW = graph.bounds.width * minimapScale
  const drawnH = graph.bounds.height * minimapScale
  const offsetX = PADDING + (innerW - drawnW) / 2
  const offsetY = PADDING + (innerH - drawnH) / 2

  // Viewport rectangle: the visible portion of the canvas in canvas
  // coordinates, projected onto the minimap.
  const visCanvasX = -transform.x / transform.scale
  const visCanvasY = -transform.y / transform.scale
  const visCanvasW = containerWidth / transform.scale
  const visCanvasH = containerHeight / transform.scale

  const rectX = offsetX + visCanvasX * minimapScale
  const rectY = offsetY + visCanvasY * minimapScale
  const rectW = visCanvasW * minimapScale
  const rectH = visCanvasH * minimapScale

  /**
   * Translate a minimap-local point (svg coords) into a new canvas
   * transform that recentres the viewport on it. Keeps the current
   * scale.
   */
  const recentreAt = (mx: number, my: number) => {
    const canvasX = (mx - offsetX) / minimapScale
    const canvasY = (my - offsetY) / minimapScale
    const newX = containerWidth / 2 - canvasX * transform.scale
    const newY = containerHeight / 2 - canvasY * transform.scale
    setTransform({ x: newX, y: newY, scale: transform.scale })
  }

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    const el = minimapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const localX = e.clientX - r.left
    const localY = e.clientY - r.top

    // If clicking inside the viewport rectangle, start a drag rather
    // than an instant recentre — preserves the click-to-recentre vs
    // drag-to-pan distinction.
    const insideViewport =
      localX >= rectX && localX <= rectX + rectW && localY >= rectY && localY <= rectY + rectH

    if (insideViewport) {
      setDragging(true)
      dragOffset.current = { dx: localX - rectX, dy: localY - rectY }
    } else {
      recentreAt(localX, localY)
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const el = minimapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const localX = e.clientX - r.left
    const localY = e.clientY - r.top
    // Move the viewport rectangle so its top-left tracks the cursor
    // (offset by the initial grab point) — the canvas centre follows.
    const newRectX = localX - dragOffset.current.dx
    const newRectY = localY - dragOffset.current.dy
    const centreMx = newRectX + rectW / 2
    const centreMy = newRectY + rectH / 2
    recentreAt(centreMx, centreMy)
  }

  const onMouseUp = () => setDragging(false)

  const opacity = nearby || dragging ? 1 : 0.4

  return (
    <div
      ref={minimapRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        width: MINIMAP_W,
        height: MINIMAP_H,
        background: colors.backgroundSubtle,
        border: `1px solid ${colors.borderHover}`,
        borderRadius: 4,
        opacity,
        transition: 'opacity 0.18s',
        cursor: dragging ? 'grabbing' : 'crosshair',
        zIndex: 10,
        pointerEvents: 'auto',
        fontFamily: fonts.mono,
      }}
    >
      <svg width={MINIMAP_W} height={MINIMAP_H} style={{ display: 'block' }}>
        {/* Device dots */}
        {graph.nodes.map((node) => {
          // Use the centre of each node, not its top-left, so dot
          // distribution reflects actual layout density.
          const cx = offsetX + (node.x + node.width / 2) * minimapScale
          const cy = offsetY + (node.y + node.height / 2) * minimapScale
          return (
            <circle
              key={node.device.id}
              cx={cx}
              cy={cy}
              r={DOT_RADIUS}
              fill={deviceAccent(node.device.type)}
              opacity={0.6}
            />
          )
        })}

        {/* Viewport rectangle */}
        <rect
          x={rectX}
          y={rectY}
          width={rectW}
          height={rectH}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1.5}
          strokeDasharray="2 2"
        />

        {/* Caption */}
        <text
          x={MINIMAP_W - PADDING}
          y={PADDING + 8}
          textAnchor="end"
          fill={colors.textMuted}
          fontSize={8}
          fontFamily={fonts.mono}
          fontWeight={700}
          letterSpacing="0.1em"
        >
          MINIMAP
        </text>
      </svg>
    </div>
  )
}
