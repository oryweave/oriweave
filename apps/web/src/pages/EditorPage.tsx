import html2canvas from 'html2canvas'
import React, { useState, useMemo, useCallback, useRef } from 'react'
import { parse, layout } from '@oriweave/core'
import { AppNav } from '../components/AppNav'
import { buildDeviceMap } from '../lib/device'
import { PreviewPane } from '../components/PreviewPane'
import SAMPLE_YAML from '../sample.yaml?raw'
import { SharePanel } from '../components/SharePanel'
import { YamlEditor } from '../components/YamlEditor'

interface EditorPageProps {
  initialYaml?: string
  editingSlug?: string
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
  background: 'rgba(12, 21, 39, 0.9)',
  border: '1px solid rgba(0, 229, 255, 0.12)',
  borderRadius: 6,
  color: '#78909c',
  cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 14,
  padding: 0,
  transition: 'all 0.15s',
}

export const EditorPage: React.FC<EditorPageProps> = ({ initialYaml, editingSlug }) => {
  const [yaml, setYaml] = useState(initialYaml || SAMPLE_YAML)
  const [splitRatio, setSplitRatio] = useState(0.22)
  const [resizing, setResizing] = useState(false)
  const [editorVisible, setEditorVisible] = useState(true)

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
  }, [yaml])

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
        backgroundColor: '#080f1e',
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

  const title = editingSlug ? `EDITING: ${editingSlug}` : 'EDITOR'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#080f1e',
      }}
    >
      <AppNav
        title={title}
        primaryAction={
          <SharePanel
            yaml={yaml}
            onExportPng={handleExportPng}
            isExporting={isExporting}
            editingSlug={editingSlug}
          />
        }
      />

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
                background: resizing ? 'rgba(0,229,255,0.3)' : 'rgba(0,229,255,0.08)',
                transition: 'background 0.15s',
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
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.35)'
              e.currentTarget.style.color = '#00e5ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.12)'
              e.currentTarget.style.color = '#78909c'
            }}
            title={editorVisible ? 'Hide editor' : 'Show editor'}
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

          <PreviewPane
            graph={graph}
            errors={errors}
            deviceMap={deviceMap}
            connections={connections}
            captureRef={captureRef}
          />
        </div>
      </div>
    </div>
  )
}
