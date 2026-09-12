import React from 'react'
import { TopologyCanvas } from '@oriweave/renderer'
import type { PositionedGraph, ValidationError, Device, Connection } from '@oriweave/core'

interface PreviewPaneProps {
  graph: PositionedGraph | null
  errors: ValidationError[]
  deviceMap: Map<string, Device>
  connections: Connection[]
  captureRef: React.RefObject<HTMLDivElement>
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  graph,
  errors,
  deviceMap,
  connections,
  captureRef,
}) => {
  if (errors.some((e) => e.severity === 'error') || !graph) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#080f1e',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#455a64',
          fontSize: 13,
          textAlign: 'center',
          padding: 40,
        }}
      >
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div>Fix the YAML errors to see the topology preview.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div ref={captureRef} style={{ height: '100%' }}>
        <TopologyCanvas graph={graph} deviceMap={deviceMap} connections={connections} />
      </div>
    </div>
  )
}
