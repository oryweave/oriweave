import { describe, it, expect } from 'vitest'
import {
  buildDeviceToCollapsedGroupMap,
  getGroupSubtreeIds,
  rerouteEdgeForCollapse,
  selectAutoCollapsedGroupIds,
  supernodeCentre,
  countDevicesInGroup,
} from '../src/lib/collapse'
import { buildDevice, buildEdge, buildNode } from './fixtures'
import type { Group, PositionedGroup } from '@oriweave/core'

describe('getGroupSubtreeIds', () => {
  it('returns just the root when the group has no children', () => {
    const groups: Group[] = [{ id: 'a', name: 'a' }]

    expect(getGroupSubtreeIds('a', groups)).toEqual(new Set(['a']))
  })

  it('returns the full descendant tree (root + transitive children)', () => {
    // a — b — c   and   a — d
    const groups: Group[] = [
      { id: 'a', name: 'a' },
      { id: 'b', name: 'b', parent: 'a' },
      { id: 'c', name: 'c', parent: 'b' },
      { id: 'd', name: 'd', parent: 'a' },
      { id: 'other', name: 'other' },
    ]

    expect(getGroupSubtreeIds('a', groups)).toEqual(new Set(['a', 'b', 'c', 'd']))
  })
})

describe('buildDeviceToCollapsedGroupMap', () => {
  it('returns an empty map when nothing is collapsed', () => {
    const groups: Group[] = [{ id: 'g1', name: 'g1' }]
    const nodes = [buildNode(buildDevice({ id: 'd1', group: 'g1' }))]

    expect(buildDeviceToCollapsedGroupMap(new Set(), groups, nodes).size).toBe(0)
  })

  it('maps devices in a collapsed group to that group id', () => {
    const groups: Group[] = [{ id: 'g1', name: 'g1' }]
    const nodes = [
      buildNode(buildDevice({ id: 'd1', group: 'g1' })),
      buildNode(buildDevice({ id: 'd2', group: 'g1' })),
      buildNode(buildDevice({ id: 'd3' })), // ungrouped
    ]

    const map = buildDeviceToCollapsedGroupMap(new Set(['g1']), groups, nodes)

    expect(map.get('d1')).toBe('g1')
    expect(map.get('d2')).toBe('g1')
    expect(map.has('d3')).toBe(false)
  })

  it('maps devices in a nested subgroup to the collapsed parent', () => {
    // g1 collapsed, g2 inside g1 (not collapsed). A device in g2
    // still maps to g1 because the *outermost* collapsed ancestor
    // wins.
    const groups: Group[] = [
      { id: 'g1', name: 'g1' },
      { id: 'g2', name: 'g2', parent: 'g1' },
    ]
    const nodes = [buildNode(buildDevice({ id: 'd1', group: 'g2' }))]

    const map = buildDeviceToCollapsedGroupMap(new Set(['g1']), groups, nodes)

    expect(map.get('d1')).toBe('g1')
  })

  it('picks the outermost when both parent and child groups are collapsed', () => {
    const groups: Group[] = [
      { id: 'g1', name: 'g1' },
      { id: 'g2', name: 'g2', parent: 'g1' },
    ]
    const nodes = [buildNode(buildDevice({ id: 'd1', group: 'g2' }))]

    const map = buildDeviceToCollapsedGroupMap(new Set(['g1', 'g2']), groups, nodes)

    expect(map.get('d1')).toBe('g1')
  })
})

describe('rerouteEdgeForCollapse', () => {
  const groupToCentre = new Map([
    ['g1', { x: 50, y: 50 }],
    ['g2', { x: 200, y: 200 }],
  ])

  it('returns the edge unchanged when neither endpoint is collapsed', () => {
    const edge = buildEdge('a', 'b')
    const result = rerouteEdgeForCollapse(edge, new Map(), groupToCentre)

    expect(result).toBe(edge)
  })

  it('hides the edge when both endpoints are inside the same collapsed group', () => {
    const edge = buildEdge('a', 'b')
    const map = new Map([
      ['a', 'g1'],
      ['b', 'g1'],
    ])

    expect(rerouteEdgeForCollapse(edge, map, groupToCentre)).toBeNull()
  })

  it('re-anchors the from endpoint when only `a` is inside a collapsed group', () => {
    const edge = buildEdge('a', 'b')
    const map = new Map([['a', 'g1']])

    const result = rerouteEdgeForCollapse(edge, map, groupToCentre)

    expect(result).not.toBeNull()
    expect(result!.points[0]).toEqual({ x: 50, y: 50 })
    expect(result!.points[1]).toEqual(edge.points[edge.points.length - 1])
  })

  it('re-anchors both endpoints when in two different collapsed groups', () => {
    const edge = buildEdge('a', 'b')
    const map = new Map([
      ['a', 'g1'],
      ['b', 'g2'],
    ])

    const result = rerouteEdgeForCollapse(edge, map, groupToCentre)

    expect(result).not.toBeNull()
    expect(result!.points).toEqual([
      { x: 50, y: 50 },
      { x: 200, y: 200 },
    ])
  })
})

describe('supernodeCentre', () => {
  it('returns the centre of the group bounding box', () => {
    const group: PositionedGroup = {
      group: { id: 'g', name: 'g' },
      x: 100,
      y: 50,
      width: 200,
      height: 100,
    }

    expect(supernodeCentre(group)).toEqual({ x: 200, y: 100 })
  })
})

describe('countDevicesInGroup', () => {
  it('counts devices in the group and all descendant subgroups', () => {
    const groups: Group[] = [
      { id: 'g1', name: 'g1' },
      { id: 'g2', name: 'g2', parent: 'g1' },
    ]
    const nodes = [
      buildNode(buildDevice({ id: 'd1', group: 'g1' })),
      buildNode(buildDevice({ id: 'd2', group: 'g2' })),
      buildNode(buildDevice({ id: 'd3', group: 'g2' })),
      buildNode(buildDevice({ id: 'd4' })), // ungrouped
    ]

    expect(countDevicesInGroup('g1', groups, nodes)).toBe(3)
    expect(countDevicesInGroup('g2', groups, nodes)).toBe(2)
  })
})

describe('selectAutoCollapsedGroupIds', () => {
  it('returns only synthetic (auto-clustered) group ids', () => {
    const groups: Group[] = [
      { id: 'g1', name: 'g1' },
      { id: '__autocluster__core', name: '24 devices', synthetic: true },
    ]

    expect(selectAutoCollapsedGroupIds(groups)).toEqual(new Set(['__autocluster__core']))
  })

  it('returns an empty set when there are no synthetic groups', () => {
    const groups: Group[] = [{ id: 'g1', name: 'g1' }]

    expect(selectAutoCollapsedGroupIds(groups).size).toBe(0)
  })
})
