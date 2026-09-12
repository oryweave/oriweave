import type { Device, PositionedEdge, PositionedNode, Connection } from '@oriweave/core'

export function buildDevice(overrides: Partial<Device> & { id: string }): Device {
  const { id, name, type, ...rest } = overrides

  return {
    id,
    name: name ?? id,
    type: type ?? 'device',
    ...rest,
  }
}

export function buildNode(device: Device, overrides: Partial<PositionedNode> = {}): PositionedNode {
  return {
    device,
    x: 0,
    y: 0,
    width: 300,
    height: 160,
    depth: 0,
    ...overrides,
  }
}

export function buildEdge(from: string, to: string, type?: string): PositionedEdge {
  const conn: Connection = { from, to, type }
  return {
    connection: conn,
    fromNodeId: from,
    toNodeId: to,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
  }
}
