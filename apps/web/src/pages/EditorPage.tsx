import html2canvas from 'html2canvas'
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { parse, layout } from '@oriweave/core'
import { colors, fonts, radii, motion } from '@oriweave/renderer'
import { AppNav } from '../components/AppNav'
import { buildDeviceMap } from '../lib/device'
import { KeyboardShortcutsPanel } from '../components/KeyboardShortcutsPanel'
import { PreviewPane } from '../components/PreviewPane'
import SAMPLE_YAML from '../sample.yaml?raw'
import { SharePanel } from '../components/SharePanel'
import { YamlEditor } from '../components/YamlEditor'

interface EditorPageProps {
  initialYaml?: string
  editingSlug?: string
  initialVisibility?: 'public' | 'unlisted'
}

const toggleButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: 52,
  left: 8,
  zIndex: 20,
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(22, 27, 34, 0.9)',
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  color: colors.textSecondary,
  cursor: 'pointer',
  fontFamily: fonts.mono,
  fontSize: 14,
  padding: 0,
  transition: `all ${motion.fast}`,
}

export const EditorPage: React.FC<EditorPageProps> = ({
  initialYaml,
  editingSlug,
  initialVisibility,
}) => {
  const [yaml, setYaml] = useState(initialYaml || SAMPLE_YAML)
  const [splitRatio, setSplitRatio] = useState(0.27)
  const [resizing, setResizing] = useState(false)
  const [editorVisible, setEditorVisible] = useState(true)
  const [renderNonce, setRenderNonce] = useState(0)
  const [justRerendered, setJustRerendered] = useState(false)

  const captureRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const { graph, errors, deviceMap, connections, networkCount } = useMemo(() => {
    const result = parse(yaml)
    if (!result.ok) {
      return {
        graph: null,
        errors: result.errors,
        deviceMap: new Map(),
        connections: [],
        networkCount: 0,
      }
    }
    try {
      const positioned = layout(result.document)
      const dMap = buildDeviceMap(result.document.devices)
      return {
        graph: positioned,
        errors: result.warnings,
        deviceMap: dMap,
        connections: result.document.connections ?? [],
        networkCount: result.document.networks?.length ?? 0,
      }
    } catch (e) {
      return {
        graph: null,
        errors: [
          {
            path: '',
            message: `Layout error: ${e instanceof Error ? e.message : String(e)}`,
            severity: 'error' as const,
          },
        ],
        deviceMap: new Map(),
        connections: [],
        networkCount: 0,
      }
    }
    // renderNonce isn't read above — it's here purely to let Ctrl+S force a fresh
    // layout pass (e.g. retry after a transient layout error) even when yaml hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yaml, renderNonce])

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setResizing(true)
    const onMove = (moveEvent: MouseEvent) => {
      const ratio = moveEvent.clientX / window.innerWidth
      setSplitRatio(Math.min(0.6, Math.max(0.15, ratio)))
    }
    const onUp = () => {
      setResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const handleExportPng = useCallback(async () => {
    if (!captureRef.current || !graph) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: colors.background,
        scale: 2,
        useCORS: true,
        logging: false,
        width: captureRef.current.offsetWidth,
        height: captureRef.current.offsetHeight,
      })
      const link = document.createElement('a')
      link.download = `homelab-topology-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('PNG export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }, [graph])

  // Ctrl/Cmd+S: force a fresh layout pass. Ctrl/Cmd+E: toggle the editor pane.
  // Ctrl/Cmd+Shift+P: export PNG. Global (not scoped to the YAML editor) so they
  // work regardless of which pane has focus.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()

      if (!e.shiftKey && key === 's') {
        e.preventDefault()
        setRenderNonce((n) => n + 1)
        setJustRerendered(true)
        setTimeout(() => setJustRerendered(false), 1200)
      } else if (!e.shiftKey && key === 'e') {
        e.preventDefault()
        setEditorVisible((v) => !v)
      } else if (e.shiftKey && key === 'p') {
        e.preventDefault()
        handleExportPng()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleExportPng])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: colors.background,
      }}
    >
      <AppNav />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor pane */}
        {editorVisible && (
          <>
            <div style={{ width: `${splitRatio * 100}%`, height: '100%' }}>
              <YamlEditor
                value={yaml}
                onChange={setYaml}
                errors={errors}
                networkCount={networkCount}
                deviceCount={deviceMap.size}
                connectionCount={connections.length}
              />
            </div>
            <div
              onMouseDown={onResizeStart}
              style={{
                width: 5,
                cursor: 'col-resize',
                flexShrink: 0,
                background: resizing ? colors.primaryBorder : 'rgba(255,152,0,0.08)',
                transition: `background ${motion.fast}`,
              }}
            />
          </>
        )}

        {/* Canvas pane */}
        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
          {/* Editor toggle button */}
          <button
            onClick={() => setEditorVisible((v) => !v)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = colors.borderHover
              e.currentTarget.style.color = colors.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.color = colors.textSecondary
            }}
            title={`${editorVisible ? 'Hide editor' : 'Show editor'} (Ctrl+E)`}
            style={toggleButtonStyle}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              {editorVisible ? (
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              ) : (
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              )}
            </svg>
          </button>

          {justRerendered && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 48,
                zIndex: 20,
                padding: '6px 10px',
                background: 'rgba(22, 27, 34, 0.9)',
                border: `1px solid ${colors.primaryBorder}`,
                borderRadius: radii.md,
                color: colors.primary,
                fontFamily: fonts.mono,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.04em',
                pointerEvents: 'none',
              }}
            >
              ⟳ RE-RENDERED
            </div>
          )}

          <PreviewPane
            graph={graph}
            errors={errors}
            deviceMap={deviceMap}
            connections={connections}
            captureRef={captureRef}
            headerActions={
              <>
                <KeyboardShortcutsPanel />
                <SharePanel
                  yaml={yaml}
                  onExportPng={handleExportPng}
                  isExporting={isExporting}
                  editingSlug={editingSlug}
                  initialVisibility={initialVisibility}
                />
              </>
            }
          />
        </div>
      </div>
    </div>
  )
}
