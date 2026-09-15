import React, { useRef, useState, useCallback, useEffect, useLayoutEffect, useMemo } from 'react'
import { ALL_LAYERS, isLayerVisible, type LayerCategory } from '../lib/layers'
import {
  buildDeviceToCollapsedGroupMap,
  countDevicesInGroup,
  rerouteEdgeForCollapse,
  selectAutoCollapsedGroupIds,
  supernodeCentre,
} from '../lib/collapse'
import { BundleTrunk } from './BundleTrunk'
import { CanvasControls } from './CanvasControls'
import { colors, fonts, motion, radii } from '../theme'
import { computeFocusedEdgeKeys, computeFocusedNodeIds } from '../lib/focus'
import { ConnectionLine } from './ConnectionLine'
import { DensityToolbar } from './DensityToolbar'
import { DeviceCard } from './DeviceCard'
import { GroupOutline } from './GroupOutline'
import { Inspector } from './Inspector'
import { Minimap } from './Minimap'
import { resolveSupernodeIcon } from '../lib/supernode-icon'
import { SupernodePuck } from './SupernodePuck'
import type { PositionedGraph, PositionedEdge, Device, Connection } from '@oriweave/core'

interface TopologyCanvasProps {
  graph: PositionedGraph
  deviceMap: Map<string, Device>
  connections: Connection[]
  readOnly?: boolean
  /**
   * Rendered at the right edge of the title bar, after the filter box — matches the design's
   * `App.jsx`, which puts the SHARE button in the canvas's own title row, not the global nav.
   * A plain slot (not a specific component) so this package stays decoupled from apps/web, which
   * owns whatever actually goes here (e.g. a share/export panel that calls the API).
   */
  headerActions?: React.ReactNode
}

interface Transform {
  x: number
  y: number
  scale: number
}

const CLICK_VS_DRAG_PX = 4

// Bottom chrome row (zoom stack + legend + minimap) drops panels by priority as available
// width shrinks — legend first, then minimap — mirroring the design's `showLegend`/
// `showMinimap` thresholds. `avail` is measured after subtracting the Inspector's inset.
const LEGEND_MIN_AVAIL_PX = 560
const MINIMAP_MIN_AVAIL_PX = 260
const CHROME_ROW_EDGE_PADDING_PX = 32

const INSPECTOR_WIDTH_PX = 300
const INSPECTOR_MAX_RATIO = 0.72

const noop = () => {}

function matchesFilter(device: Device, filter: string): boolean {
  if (!filter.trim()) return true
  const haystack = `${device.name} ${device.type} ${device.ip ?? ''}`.toLowerCase()
  return haystack.includes(filter.trim().toLowerCase())
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  graph,
  deviceMap,
  connections,
  readOnly = false,
  headerActions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const dragMoved = useRef(false)

  const [inspectedDevice, setInspectedDevice] = useState<Device | null>(null)
  const [inspectedParent, setInspectedParent] = useState<Device | null>(null)

  const [highlightedEdge, setHighlightedEdge] = useState<{ from: string; to: string } | null>(null)

  const [enabledLayers, setEnabledLayers] = useState<Set<LayerCategory>>(() => new Set(ALL_LAYERS))
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set())
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [focusDepth, setFocusDepth] = useState<0 | 1 | 2>(0)
  const [filter, setFilter] = useState('')
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  // Track container size for the minimap's viewport-rect maths. A
  // ResizeObserver keeps it in sync on layout changes.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setContainerSize({ width: r.width, height: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-clustered groups (`Group.synthetic`, see core's layout.ts) start
  // collapsed by default, unlike author-defined groups. Seeded once per
  // synthetic id — tracked in a ref — so re-layout on later edits doesn't
  // re-collapse a cluster the user has already expanded.
  const seenAutoClusterIds = useRef<Set<string>>(new Set())
  useEffect(() => {
    const autoIds = selectAutoCollapsedGroupIds(graph.groups.map((g) => g.group))
    const newIds = Array.from(autoIds).filter((id) => !seenAutoClusterIds.current.has(id))
    if (newIds.length === 0) return
    for (const id of newIds) seenAutoClusterIds.current.add(id)
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      for (const id of newIds) next.add(id)
      return next
    })
  }, [graph.groups])

  const handleChildClick = useCallback((child: Device, parent: Device) => {
    setInspectedDevice(child)
    setInspectedParent(parent)
  }, [])

  const handleOpenDetail = useCallback((device: Device, parent: Device | null) => {
    if (dragMoved.current) return
    setInspectedDevice(device)
    setInspectedParent(parent)
  }, [])

  const closeInspector = useCallback(() => {
    setInspectedDevice(null)
    setInspectedParent(null)
  }, [])

  const handlePortHover = useCallback((deviceId: string, connectedTo: string | null) => {
    if (connectedTo) {
      setHighlightedEdge({ from: deviceId, to: connectedTo })
    } else {
      setHighlightedEdge(null)
    }
  }, [])

  // Click on a device card or supernode → set selection. Suppressed if
  // the user actually dragged the canvas during this gesture.
  const handleSelect = useCallback((deviceId: string) => {
    if (dragMoved.current) return
    setFocusedNodeId(deviceId)
    setFocusDepth(0)
  }, [])

  const handleToggleLayer = useCallback((layer: LayerCategory) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }, [])

  const handleToggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  // Focus toggle (also wired to the F key). No-op if nothing selected.
  const handleFocusToggle = useCallback(() => {
    if (focusedNodeId === null) return
    setFocusDepth((d) => {
      if (d === 0) return 1
      if (d === 1) return 2
      return 0 // third press clears (equivalent to ESC)
    })
  }, [focusedNodeId])

  // F + ESC key handling.
  useEffect(() => {
    if (readOnly) return
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack keys when the user is typing into a form field.
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (e.key === 'Escape') {
        setFocusDepth(0)
        setFocusedNodeId(null)
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        if (focusedNodeId === null) return
        setFocusDepth((d) => {
          if (d === 0) return 1
          if (d === 1) return 2
          return 0
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedNodeId, readOnly])

  // Auto-fit on graph change AND on container size change. `useLayoutEffect`, not `useEffect` —
  // it must run before the browser paints, otherwise the first frame renders at the default
  // {x:0, y:0, scale:1} transform (top-left corner, unscaled) and only snaps to the fitted,
  // centered transform on the next frame once the ResizeObserver's callback fires. That one-frame
  // flash is exactly what reads as "not centered on page load."
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const fit = () => {
      const containerWidth = el.clientWidth
      const containerHeight = el.clientHeight
      if (containerWidth === 0 || containerHeight === 0) return
      const headerHeight = readOnly ? 0 : 44
      const padding = 40
      const availableWidth = containerWidth - padding * 2
      const availableHeight = containerHeight - headerHeight - padding * 2
      const scaleX = availableWidth / graph.bounds.width
      const scaleY = availableHeight / graph.bounds.height
      const scale = Math.min(scaleX, scaleY, 1)
      const scaledWidth = graph.bounds.width * scale
      const scaledHeight = graph.bounds.height * scale
      const x = (containerWidth - scaledWidth) / 2
      const y = headerHeight + (availableHeight - scaledHeight) / 2 + padding
      setTransform({ x, y, scale })
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [graph, readOnly])

  // Non-passive wheel zoom
  useEffect(() => {
    if (readOnly) return
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.92 : 1.08
      setTransform((t) => {
        const newScale = Math.min(3, Math.max(0.15, t.scale * delta))
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        return {
          scale: newScale,
          x: cx - (cx - t.x) * (newScale / t.scale),
          y: cy - (cy - t.y) * (newScale / t.scale),
        }
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [readOnly])

  // Pan
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setDragging(true)
      dragMoved.current = false
      dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y }
    },
    [transform],
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      if (Math.abs(dx) > CLICK_VS_DRAG_PX || Math.abs(dy) > CLICK_VS_DRAG_PX) {
        dragMoved.current = true
      }
      setTransform((t) => ({
        ...t,
        x: dragStart.current.tx + dx,
        y: dragStart.current.ty + dy,
      }))
    },
    [dragging],
  )

  const onMouseUp = useCallback(() => setDragging(false), [])

  // Zoom controls
  const onZoomIn = useCallback(() => {
    setTransform((t) => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))
  }, [])

  const onZoomOut = useCallback(() => {
    setTransform((t) => ({ ...t, scale: Math.max(0.15, t.scale / 1.2) }))
  }, [])

  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const headerHeight = 44
    const padding = 40
    const availableWidth = rect.width - padding * 2
    const availableHeight = rect.height - headerHeight - padding * 2
    const scaleX = availableWidth / graph.bounds.width
    const scaleY = availableHeight / graph.bounds.height
    const scale = Math.min(scaleX, scaleY, 1)
    const scaledWidth = graph.bounds.width * scale
    const scaledHeight = graph.bounds.height * scale
    const x = (rect.width - scaledWidth) / 2
    const y = headerHeight + (availableHeight - scaledHeight) / 2 + padding
    setTransform({ x, y, scale })
  }, [graph])

  const resetView = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (rect.width - graph.bounds.width) / 2
    setTransform({ x, y: 60, scale: 1 })
  }, [graph])

  // Toolbar-driven zoom: set scale to a specific percent, keeping the
  // canvas centre fixed at the viewport centre (Phase 2d).
  const handleSetZoomPercent = useCallback((percent: number) => {
    const newScale = percent / 100
    const el = containerRef.current
    if (!el) {
      setTransform((t) => ({ ...t, scale: newScale }))
      return
    }
    const rect = el.getBoundingClientRect()
    setTransform((t) => {
      const cx = rect.width / 2
      const cy = rect.height / 2
      return {
        scale: newScale,
        x: cx - (cx - t.x) * (newScale / t.scale),
        y: cy - (cy - t.y) * (newScale / t.scale),
      }
    })
  }, [])

  // ── Derived state (memoised) ─────────────────────────────────────

  // Map of device-id → outermost-collapsed-group-id. Empty when no
  // groups are collapsed (cheap default-path).
  const deviceToCollapsed = useMemo(
    () =>
      buildDeviceToCollapsedGroupMap(
        collapsedGroupIds,
        graph.groups.map((g) => g.group),
        graph.nodes,
      ),
    [collapsedGroupIds, graph.groups, graph.nodes],
  )

  // Map of collapsed-group-id → its supernode centre point.
  const groupCentres = useMemo(() => {
    const centres = new Map<string, { x: number; y: number }>()
    for (const pg of graph.groups) {
      if (collapsedGroupIds.has(pg.group.id)) {
        centres.set(pg.group.id, supernodeCentre(pg))
      }
    }
    return centres
  }, [collapsedGroupIds, graph.groups])

  // Focused-node set + focused-edge set (depth-K BFS over the original
  // edge graph, NOT the re-routed one — focus is about the underlying
  // topology, not what's currently visible).
  const focusedNodeIds = useMemo(() => {
    if (focusedNodeId === null) return new Set<string>()
    if (focusDepth === 0) return new Set([focusedNodeId])
    return computeFocusedNodeIds(focusedNodeId, focusDepth, graph.edges)
  }, [focusedNodeId, focusDepth, graph.edges])

  // Edge keys used for the *render* path use the same `edgeKey`
  // convention as the renderer below — colocated so the two stay in
  // sync.
  const edgeKey = useCallback((e: PositionedEdge): string => `${e.fromNodeId}→${e.toNodeId}`, [])

  const focusedEdgeKeys = useMemo(() => {
    if (focusDepth === 0 || focusedNodeId === null) return new Set<string>()
    return computeFocusedEdgeKeys(focusedNodeIds, graph.edges, edgeKey)
  }, [focusedNodeIds, focusDepth, focusedNodeId, graph.edges, edgeKey])

  // Apply layer filter + collapse re-routing to produce the actual
  // edges we render. Done in one pass so we don't iterate edges twice.
  const effectiveEdges = useMemo(() => {
    const out: PositionedEdge[] = []
    for (const e of graph.edges) {
      if (!isLayerVisible(e.connection.type, enabledLayers)) continue
      const rerouted = rerouteEdgeForCollapse(e, deviceToCollapsed, groupCentres)
      if (rerouted === null) continue
      out.push(rerouted)
    }
    return out
  }, [graph.edges, enabledLayers, deviceToCollapsed, groupCentres])

  // Per-supernode summary used by the SupernodePuck renderer.
  const supernodes = useMemo(() => {
    return graph.groups
      .filter((pg) => collapsedGroupIds.has(pg.group.id))
      .map((pg) => {
        // Recursive device count, including nested subgroups.
        const count = countDevicesInGroup(
          pg.group.id,
          graph.groups.map((g) => g.group),
          graph.nodes,
        )
        // Member-device list for icon resolution.
        const members: Device[] = []
        for (const node of graph.nodes) {
          if (deviceToCollapsed.get(node.device.id) === pg.group.id) {
            members.push(node.device)
          }
        }
        const representativeType = resolveSupernodeIcon(members)
        const isInFocus = members.some((d) => focusedNodeIds.has(d.id))
        return {
          pg,
          centre: supernodeCentre(pg),
          count,
          representativeType,
          isInFocus,
          isFocusedDirectly: focusedNodeId !== null && members.some((d) => d.id === focusedNodeId),
        }
      })
  }, [
    collapsedGroupIds,
    graph.groups,
    graph.nodes,
    deviceToCollapsed,
    focusedNodeIds,
    focusedNodeId,
  ])

  // Group-outline dim: a group dims when every one of its visible
  // devices is dimmed. Computed once so each `GroupOutline` doesn't
  // re-scan.
  const dimmedGroupIds = useMemo(() => {
    if (focusDepth === 0) return new Set<string>()
    const dimmed = new Set<string>()
    // Pre-bucket nodes by their direct group for O(N) instead of O(N×G).
    const nodesByGroup = new Map<string, Device[]>()
    for (const node of graph.nodes) {
      const gid = node.device.group
      if (!gid) continue
      const list = nodesByGroup.get(gid) ?? []
      list.push(node.device)
      nodesByGroup.set(gid, list)
    }
    for (const pg of graph.groups) {
      const members = nodesByGroup.get(pg.group.id) ?? []
      if (members.length === 0) continue
      const anyInFocus = members.some((d) => focusedNodeIds.has(d.id))
      if (!anyInFocus) dimmed.add(pg.group.id)
    }
    return dimmed
  }, [focusDepth, focusedNodeIds, graph.groups, graph.nodes])

  // ── Zoom-driven LOD derivations ─────────────────────────────────
  const zoom = transform.scale
  const hideSublabels = zoom < 0.75
  const showLabelFor = useMemo(() => {
    const map = new Map<string, boolean>()
    const thinning = zoom < 0.5
    graph.nodes.forEach((node, i) => {
      map.set(node.device.id, thinning ? i % 4 === 0 : true)
    })
    return map
  }, [zoom, graph.nodes])

  const focusActive = focusDepth > 0

  const legend = [
    { label: 'ETHERNET', color: colors.green, dash: '' },
    { label: 'WI-FI', color: colors.networkAccent, dash: '2 4' },
    { label: 'VPN', color: colors.amber, dash: '6 4' },
  ]

  // Inspector inset (Phase D reuses `inspectedDevice` as the panel's open/closed state).
  const inspectorInset = inspectedDevice
    ? Math.min(INSPECTOR_WIDTH_PX, containerSize.width * INSPECTOR_MAX_RATIO)
    : 0
  const chromeRowAvail = containerSize.width - inspectorInset - CHROME_ROW_EDGE_PADDING_PX
  const showLegend = !readOnly && chromeRowAvail >= LEGEND_MIN_AVAIL_PX
  const showMinimap = !readOnly && chromeRowAvail >= MINIMAP_MIN_AVAIL_PX

  return (
    <div
      ref={containerRef}
      onMouseDown={readOnly ? undefined : onMouseDown}
      onMouseMove={readOnly ? undefined : onMouseMove}
      onMouseUp={readOnly ? undefined : onMouseUp}
      onMouseLeave={readOnly ? undefined : onMouseUp}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: colors.background,
        cursor: readOnly ? 'default' : dragging ? 'grabbing' : 'grab',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      {!readOnly && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 12,
            background: 'rgba(8,15,30,0.88)',
            backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${colors.border}`,
            // `position: absolute` + a z-index makes this header its own stacking context — a
            // child's z-index (like SharePanel's dropdown, z-index 30) only competes *within*
            // that context, not against outside siblings. Against DensityToolbar/the bottom
            // chrome row (both z-index 10, rendered later in the tree), the whole header used to
            // lose the paint order at an equal 10, letting them cover the top of any dropdown
            // that opens from inside it. Bumped to 11 — matches the Inspector panel's z-index, so
            // Inspector (rendered after this header) still wins that specific tie by DOM order,
            // preserving "Inspector overlaps the header" from its own z-index comment below.
            zIndex: 11,
            fontFamily: fonts.mono,
          }}
        >
          <span style={{ color: colors.textPrimary, fontWeight: 700, fontSize: 13 }}>
            {graph.meta.title}
          </span>
          {graph.meta.subtitle && (
            <span style={{ color: colors.textMuted, fontSize: 10 }}>{graph.meta.subtitle}</span>
          )}
          {(graph.meta.tags ?? []).map((tag: string) => (
            <span
              key={tag}
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: colors.green,
                background: colors.greenDim,
                borderRadius: 3,
                padding: '2px 8px',
              }}
            >
              {tag}
            </span>
          ))}
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              border: `1px solid ${colors.border}`,
              borderRadius: radii.sm,
              flexShrink: 0,
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill={colors.textMuted}>
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter devices"
              style={{
                background: 'transparent',
                border: 0,
                outline: 'none',
                color: colors.textPrimary,
                fontFamily: fonts.mono,
                fontSize: 10,
                width: 100,
                minWidth: 0,
              }}
            />
          </div>
          {headerActions}
        </div>
      )}

      {/* density toolbar (anchored top-right under the header). */}
      {!readOnly && (
        <DensityToolbar
          enabledLayers={enabledLayers}
          onToggleLayer={handleToggleLayer}
          zoomPercent={Math.round(zoom * 100)}
          onSetZoom={handleSetZoomPercent}
          focusActive={focusActive}
          onFocus={handleFocusToggle}
        />
      )}

      {/* Canvas */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        <svg
          width={graph.bounds.width}
          height={graph.bounds.height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {graph.groups.map((g, i) => {
            const isTopLevel = (g.depth ?? 0) === 0
            const isCollapsed = collapsedGroupIds.has(g.group.id)
            return (
              <GroupOutline
                key={`${g.group.id}-${i}`}
                group={g}
                dimmed={dimmedGroupIds.has(g.group.id)}
                hideLabel={hideSublabels && (g.depth ?? 0) > 0}
                onToggleCollapse={
                  isTopLevel && !isCollapsed ? () => handleToggleCollapse(g.group.id) : undefined
                }
              />
            )
          })}
          {(() => {
            // Group edges by bundle. Edges without a bundle render individually as before (load-bearing backwards compat).
            const bundles = new Map<string, PositionedEdge[]>()
            const standalone: PositionedEdge[] = []
            for (const edge of effectiveEdges) {
              if (edge.bundle !== undefined) {
                const list = bundles.get(edge.bundle) ?? []
                list.push(edge)
                bundles.set(edge.bundle, list)
              } else {
                standalone.push(edge)
              }
            }

            const isEdgeHighlighted = (e: PositionedEdge): boolean =>
              highlightedEdge !== null &&
              ((e.fromNodeId === highlightedEdge.from && e.toNodeId === highlightedEdge.to) ||
                (e.fromNodeId === highlightedEdge.to && e.toNodeId === highlightedEdge.from))

            // Focus dim: in focus mode, any edge NOT in the focused edge set is dimmed regardless of port hover.
            const isEdgeFocusDimmed = (e: PositionedEdge): boolean =>
              focusDepth > 0 && !focusedEdgeKeys.has(edgeKey(e))

            return (
              <>
                {standalone.map((edge) => {
                  const hi = isEdgeHighlighted(edge)
                  // Combine port-hover dim and focus dim — either path dims the edge.
                  const isDimmed = (highlightedEdge !== null && !hi) || isEdgeFocusDimmed(edge)
                  return (
                    <ConnectionLine
                      key={edgeKey(edge)}
                      edge={edge}
                      highlighted={hi}
                      dimmed={isDimmed}
                    />
                  )
                })}
                {Array.from(bundles.entries()).map(([bundleName, members]) => {
                  const highlightedMember = members.find(isEdgeHighlighted)
                  const otherBundleHighlighted = highlightedEdge !== null && !highlightedMember
                  const bundleFocusDimmed =
                    focusDepth > 0 && !members.some((m) => focusedEdgeKeys.has(edgeKey(m)))
                  return (
                    <BundleTrunk
                      key={`bundle-${bundleName}`}
                      edges={members}
                      keyFor={edgeKey}
                      highlightedKey={highlightedMember ? edgeKey(highlightedMember) : undefined}
                      dimmed={otherBundleHighlighted || bundleFocusDimmed}
                    />
                  )
                })}
              </>
            )
          })()}
        </svg>
        {graph.nodes.map((node) => {
          // Suppress devices that have been swallowed by a collapsed
          // group; their supernode renders in their place.
          if (deviceToCollapsed.has(node.device.id)) return null
          const original = deviceMap.get(node.device.id)
          const isFocused = node.device.id === focusedNodeId
          const isFocusDimmed = focusDepth > 0 && !focusedNodeIds.has(node.device.id)
          const isFilterDimmed = !matchesFilter(node.device, filter)
          const isDimmed = isFocusDimmed || isFilterDimmed
          return (
            <DeviceCard
              key={node.device.id}
              node={node}
              originalDevice={original ?? node.device}
              onChildClick={readOnly ? noop : handleChildClick}
              portAssignments={graph.portAssignments.get(node.device.id) ?? []}
              portEnumeration={graph.portEnumerations.get(node.device.id) ?? []}
              onPortHover={readOnly ? undefined : handlePortHover}
              dimmed={isDimmed}
              focused={isFocused}
              zoomScale={zoom}
              showLabel={showLabelFor.get(node.device.id) ?? true}
              onSelect={readOnly ? undefined : handleSelect}
              onOpenDetail={readOnly ? undefined : handleOpenDetail}
            />
          )
        })}
        {/* Supernodes for collapsed groups. */}
        {supernodes.map(
          ({ pg, centre, count, representativeType, isInFocus, isFocusedDirectly }) => (
            <SupernodePuck
              key={`supernode-${pg.group.id}`}
              centreX={centre.x}
              centreY={centre.y}
              label={pg.group.name}
              count={count}
              representativeType={representativeType}
              accentColor={pg.group.color ?? colors.primary}
              onExpand={readOnly ? noop : () => handleToggleCollapse(pg.group.id)}
              dimmed={focusDepth > 0 && !isInFocus}
              focused={isFocusedDirectly}
            />
          ),
        )}
      </div>

      {/* Bottom chrome row: zoom stack + legend + minimap, laid out together instead of
          each pinning its own corner, so they can drop by priority as width shrinks. */}
      {!readOnly && containerSize.width > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16 + inspectorInset,
            bottom: 16,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
            zIndex: 10,
            pointerEvents: 'none',
            transition: `right ${motion.base}`,
          }}
        >
          <CanvasControls
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onFitToScreen={fitToScreen}
            onResetView={resetView}
            scale={transform.scale}
          />
          {showLegend && (
            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                padding: '5px 9px',
                background: colors.backgroundSubtle,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                pointerEvents: 'auto',
                flexShrink: 0,
                fontFamily: fonts.mono,
              }}
            >
              {legend.map((l) => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={24} height={4}>
                    <line
                      x1={0}
                      y1={2}
                      x2={24}
                      y2={2}
                      stroke={l.color}
                      strokeWidth={1.5}
                      strokeDasharray={l.dash || 'none'}
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: 8,
                      color: colors.textMuted,
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                    }}
                  >
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 8 }} />
          {showMinimap && (
            <Minimap
              graph={graph}
              transform={transform}
              setTransform={setTransform}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
            />
          )}
        </div>
      )}

      {/* Inspector — right-side slide-in panel for the selected device. */}
      {inspectedDevice && (
        <Inspector
          child={inspectedDevice}
          parent={inspectedParent}
          connections={connections}
          width={inspectorInset}
          onClose={closeInspector}
        />
      )}
    </div>
  )
}
