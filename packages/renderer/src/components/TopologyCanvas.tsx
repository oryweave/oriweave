import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { ALL_LAYERS, isLayerVisible, type LayerCategory } from '../lib/layers'
import {
  buildDeviceToCollapsedGroupMap,
  countDevicesInGroup,
  rerouteEdgeForCollapse,
  supernodeCentre,
} from '../lib/collapse'
import { BundleTrunk } from './BundleTrunk'
import { CanvasControls } from './CanvasControls'
import { colors, fonts } from '../theme'
import { computeFocusedEdgeKeys, computeFocusedNodeIds } from '../lib/focus'
import { ConnectionLine } from './ConnectionLine'
import { DensityToolbar } from './DensityToolbar'
import { DetailModal } from './DetailModal'
import { DeviceCard } from './DeviceCard'
import { GroupOutline } from './GroupOutline'
import { Minimap } from './Minimap'
import { resolveSupernodeIcon } from '../lib/supernode-icon'
import { SupernodePuck } from './SupernodePuck'
import type { PositionedGraph, PositionedEdge, Device, Connection } from '@oriweave/core'

interface TopologyCanvasProps {
  graph: PositionedGraph
  deviceMap: Map<string, Device>
  connections: Connection[]
  readOnly?: boolean
}

interface Transform {
  x: number
  y: number
  scale: number
}

const CLICK_VS_DRAG_PX = 4
const MINIMAP_MIN_VIEWPORT_PX = 800

const noop = () => {}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  graph,
  deviceMap,
  connections,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const dragMoved = useRef(false)

  const [modalChild, setModalChild] = useState<Device | null>(null)
  const [modalParent, setModalParent] = useState<Device | null>(null)

  const [highlightedEdge, setHighlightedEdge] = useState<{ from: string; to: string } | null>(null)

  const [enabledLayers, setEnabledLayers] = useState<Set<LayerCategory>>(() => new Set(ALL_LAYERS))
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set())
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [focusDepth, setFocusDepth] = useState<0 | 1 | 2>(0)
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

  const handleChildClick = useCallback((child: Device, parent: Device) => {
    setModalChild(child)
    setModalParent(parent)
  }, [])

  const handleOpenDetail = useCallback((device: Device, parent: Device | null) => {
    if (dragMoved.current) return
    setModalChild(device)
    setModalParent(parent)
  }, [])

  const closeModal = useCallback(() => {
    setModalChild(null)
    setModalParent(null)
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

  // Auto-fit on graph change AND on container size change.
  useEffect(() => {
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
    { label: 'ETHERNET', color: '#00e676', dash: '' },
    { label: 'WI-FI', color: '#00e5ff', dash: '2 4' },
    { label: 'VPN', color: '#ffab00', dash: '6 4' },
  ]

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
            zIndex: 10,
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
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
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

      {/* Controls */}
      {!readOnly && (
        <CanvasControls
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onFitToScreen={fitToScreen}
          onResetView={resetView}
          scale={transform.scale}
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
          const isDimmed = focusDepth > 0 && !focusedNodeIds.has(node.device.id)
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

      {/* Minimap — hidden below 800px viewport width. */}
      {!readOnly && containerSize.width >= MINIMAP_MIN_VIEWPORT_PX && containerSize.width > 0 && (
        <Minimap
          graph={graph}
          transform={transform}
          setTransform={setTransform}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      )}

      {/* Modal */}
      {modalChild && (
        <DetailModal
          child={modalChild}
          parent={modalParent}
          connections={connections}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
