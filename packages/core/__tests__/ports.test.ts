import { describe, it, expect } from 'vitest'
import {
  buildDevice,
  buildConnection,
  buildDeviceWithLabelledPorts,
  buildDeviceWithAmbiguousLabel,
} from './fixtures'
import {
  assignPorts,
  enumeratePorts,
  getInterfaceGroup,
  resolvePortReference,
  getEthernetRowCount,
  needsSecondaryPortRow,
} from '../src/ports'

// ─── Enumeration ──────────────────────────────────────────────────

describe('enumeratePorts', () => {
  it('returns an empty list for a device with no interfaces', () => {
    const device = buildDevice({ id: 'bare' })

    expect(enumeratePorts(device)).toEqual([])
  })

  it('enumerates unlabelled ethernet ports in index order', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: { ethernet: { count: 4 } },
    })

    const ports = enumeratePorts(device)

    expect(ports).toHaveLength(4)
    expect(ports.map((p) => p.index)).toEqual([0, 1, 2, 3])
    expect(ports.every((p) => p.interfaceType === 'ethernet')).toBe(true)
    expect(ports.every((p) => p.label === undefined)).toBe(true)
  })

  it('emits ports in the order ethernet → sfp → usb → thunderbolt → wifi', () => {
    const device = buildDevice({
      id: 'multi',
      interfaces: {
        wifi: { standard: 'wifi-7' },
        thunderbolt: { count: 1 },
        usb: { count: 2 },
        sfp: { count: 1 },
        ethernet: { count: 1 },
      },
    })

    const types = enumeratePorts(device).map((p) => p.interfaceType)

    expect(types).toEqual(['ethernet', 'sfp', 'usb', 'usb', 'thunderbolt', 'wifi'])
  })

  it('carries labels when declared', () => {
    const ports = enumeratePorts(buildDeviceWithLabelledPorts())

    const eth = ports.filter((p) => p.interfaceType === 'ethernet')
    expect(eth.map((p) => p.label)).toEqual(['WAN', 'LAN1', 'LAN2', 'LAN3', 'LAN4'])
  })

  it('handles partial labelling — first N have labels, rest are anonymous', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: {
        ethernet: {
          count: 5,
          ports: [{ label: 'WAN' }, { label: 'LAN1' }],
        },
      },
    })

    const ports = enumeratePorts(device)

    expect(ports).toHaveLength(5)
    expect(ports[0].label).toBe('WAN')
    expect(ports[1].label).toBe('LAN1')
    expect(ports[2].label).toBeUndefined()
    expect(ports[3].label).toBeUndefined()
    expect(ports[4].label).toBeUndefined()
  })

  it('applies per-port speed override (per-port wins over group speed)', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: {
        sfp: {
          count: 2,
          speed: '1G', // group default
          ports: [
            { label: 'SFP+ 1', speed: '10G' }, // override
            { label: 'SFP+ 2' }, // falls through to group speed
          ],
        },
      },
    })

    const ports = enumeratePorts(device)

    expect(ports[0].speed).toBe('10G')
    expect(ports[1].speed).toBe('1G')
  })

  it('does not include a speed when neither port nor group declares one', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: { ethernet: { count: 1 } },
    })

    expect(enumeratePorts(device)[0].speed).toBeUndefined()
  })

  it('includes a single wifi entry at the end when wifi is present', () => {
    const device = buildDevice({
      id: 'ap',
      interfaces: {
        ethernet: { count: 1 },
        wifi: { bands: ['2.4', '5'] },
      },
    })

    const ports = enumeratePorts(device)

    expect(ports).toHaveLength(2)
    expect(ports[1]).toEqual({ interfaceType: 'wifi', index: 0 })
  })
})

// ─── Assignment carries labels ────────────────────────────────────

describe('assignPorts › label propagation', () => {
  it('skips greedy assignment on a device with a declared port map', () => {
    const device = buildDeviceWithLabelledPorts()
    const peer = buildDevice({ id: 'peer', interfaces: { ethernet: { count: 1 } } })
    const conn = buildConnection({ from: device.id, to: peer.id, type: 'ethernet' })

    const assignments = assignPorts([device, peer], [conn])

    const routerSide = assignments.get(device.id)!
    expect(routerSide).toHaveLength(0)

    const peerSide = assignments.get(peer.id)!
    expect(peerSide).toHaveLength(1)
  })

  it('attaches the label to a pinned assignment on a device with labelled ports', () => {
    const device = buildDeviceWithLabelledPorts()
    const peer = buildDevice({ id: 'peer', interfaces: { ethernet: { count: 1 } } })
    const conn = buildConnection({
      from: device.id,
      to: peer.id,
      fromPort: 'WAN',
      type: 'ethernet',
    })

    const assignments = assignPorts([device, peer], [conn])

    const routerSide = assignments.get(device.id)!
    expect(routerSide).toHaveLength(1)
    expect(routerSide[0].label).toBe('WAN')
    expect(routerSide[0].portIndex).toBe(0)
  })

  it('skips greedy on partial-label port maps too', () => {
    const device = buildDevice({
      id: 'router',
      interfaces: {
        ethernet: {
          count: 3,
          ports: [{ label: 'WAN' }],
        },
      },
    })
    const a = buildDevice({ id: 'a', interfaces: { ethernet: { count: 1 } } })
    const b = buildDevice({ id: 'b', interfaces: { ethernet: { count: 1 } } })

    const assignments = assignPorts(
      [device, a, b],
      [
        buildConnection({ from: device.id, to: a.id }),
        buildConnection({ from: device.id, to: b.id }),
      ],
    )

    const routerSide = assignments.get(device.id)!
    expect(routerSide).toHaveLength(0)
  })

  it('does not attach a label when the device has no ports[] declarations', () => {
    const device = buildDevice({ id: 'plain', interfaces: { ethernet: { count: 2 } } })
    const peer = buildDevice({ id: 'peer', interfaces: { ethernet: { count: 1 } } })

    const assignments = assignPorts(
      [device, peer],
      [buildConnection({ from: device.id, to: peer.id })],
    )

    expect(assignments.get(device.id)![0].label).toBeUndefined()
  })

  it('gives two parallel links between the same pair distinct port indices', () => {
    const sw1 = buildDevice({ id: 'sw1', interfaces: { ethernet: { count: 4 } } })
    const sw2 = buildDevice({ id: 'sw2', interfaces: { ethernet: { count: 4 } } })

    const assignments = assignPorts(
      [sw1, sw2],
      [buildConnection({ from: 'sw1', to: 'sw2' }), buildConnection({ from: 'sw1', to: 'sw2' })],
    )

    const sw1Side = assignments.get('sw1')!
    expect(sw1Side).toHaveLength(2)
    expect(sw1Side.map((p) => p.portIndex)).toEqual([0, 1])

    const sw2Side = assignments.get('sw2')!
    expect(sw2Side).toHaveLength(2)
    expect(sw2Side.map((p) => p.portIndex)).toEqual([0, 1])
  })
})

// ─── Typed interface-group lookup ─────────────────────────────────

describe('getInterfaceGroup', () => {
  it('returns the matching InterfaceGroup for ethernet/sfp', () => {
    const device = buildDevice({
      id: 'sw',
      interfaces: {
        ethernet: { count: 4, speed: '1G' },
        sfp: { count: 2 },
      },
    })

    expect(getInterfaceGroup(device, 'ethernet')).toEqual({ count: 4, speed: '1G' })
    expect(getInterfaceGroup(device, 'sfp')).toEqual({ count: 2 })
  })

  it('returns undefined for wifi (which is WifiInterface, not InterfaceGroup)', () => {
    const device = buildDevice({
      id: 'ap',
      interfaces: { wifi: { bands: ['5'] } },
    })

    expect(getInterfaceGroup(device, 'wifi')).toBeUndefined()
  })

  it('returns undefined for a device that does not declare the interface', () => {
    const device = buildDevice({
      id: 'plain',
      interfaces: { ethernet: { count: 1 } },
    })

    expect(getInterfaceGroup(device, 'sfp')).toBeUndefined()
  })

  it('returns undefined for a device with no interfaces at all', () => {
    const device = buildDevice({ id: 'bare' })

    expect(getInterfaceGroup(device, 'ethernet')).toBeUndefined()
  })

  it('returns the InterfaceGroup for usb and thunderbolt (Phase 2c widening)', () => {
    const device = buildDevice({
      id: 'host',
      interfaces: {
        usb: { count: 4 },
        thunderbolt: { count: 2 },
      },
    })

    expect(getInterfaceGroup(device, 'usb')).toEqual({ count: 4 })
    expect(getInterfaceGroup(device, 'thunderbolt')).toEqual({ count: 2 })
  })
})

// ─── Port reference resolution (Phase 2c) ─────────────────────────

describe('resolvePortReference', () => {
  it('returns the matching (interfaceType, index) for a labelled port', () => {
    const device = buildDeviceWithLabelledPorts()

    const r = resolvePortReference(device, 'LAN2')

    expect(r).toEqual({ interfaceType: 'ethernet', index: 2 })
  })

  it('returns an error when the label is missing entirely', () => {
    const device = buildDeviceWithLabelledPorts()

    const r = resolvePortReference(device, 'NOPE')

    expect('error' in r).toBe(true)
    if ('error' in r) {
      expect(r.error).toContain('NOPE')
      expect(r.error).toContain('router')
    }
  })

  it('filters by connType and rejects mismatches', () => {
    const device = buildDeviceWithLabelledPorts() // WAN is on ethernet

    const r = resolvePortReference(device, 'WAN', 'fiber') // fiber → sfp

    expect('error' in r).toBe(true)
    if ('error' in r) {
      expect(r.error).toMatch(/sfp/)
    }
  })

  it('flags ambiguity when two groups share the label and no connType is given', () => {
    const device = buildDeviceWithAmbiguousLabel()

    const r = resolvePortReference(device, 'WAN')

    expect('error' in r).toBe(true)
    if ('error' in r) {
      expect(r.error).toMatch(/ambiguous/)
      expect(r.error).toContain('ethernet.WAN')
      expect(r.error).toContain('sfp.WAN')
    }
  })

  it('disambiguates the same label when connType is given', () => {
    const device = buildDeviceWithAmbiguousLabel()

    const r = resolvePortReference(device, 'WAN', 'ethernet')

    expect(r).toEqual({ interfaceType: 'ethernet', index: 0 })
  })
})

// ─── Two-pass assignment with pinned ports (Phase 2c) ─────────────

describe('assignPorts › pinned references', () => {
  it('produces an assignment pinned to the resolved index when fromPort is set', () => {
    const router = buildDeviceWithLabelledPorts()
    const nas = buildDevice({ id: 'nas', interfaces: { ethernet: { count: 1 } } })
    const conn = buildConnection({
      from: 'router',
      to: 'nas',
      fromPort: 'LAN3', // ethernet index 3
      type: 'ethernet',
    })

    const assignments = assignPorts([router, nas], [conn])

    const routerSide = assignments.get('router')!
    expect(routerSide).toHaveLength(1)
    expect(routerSide[0].interfaceType).toBe('ethernet')
    expect(routerSide[0].portIndex).toBe(3)
    expect(routerSide[0].label).toBe('LAN3')
  })

  it('only keeps the pinned assignment when greedy is blocked by a port map', () => {
    const router = buildDeviceWithLabelledPorts()
    const a = buildDevice({ id: 'a', interfaces: { ethernet: { count: 1 } } })
    const b = buildDevice({ id: 'b', interfaces: { ethernet: { count: 1 } } })

    const assignments = assignPorts(
      [router, a, b],
      [
        // First connection pins ethernet index 0 (WAN).
        buildConnection({ from: 'router', to: 'a', fromPort: 'WAN', type: 'ethernet' }),
        // Second connection has no fromPort — greedy is blocked (router has port map).
        buildConnection({ from: 'router', to: 'b', type: 'ethernet' }),
      ],
    )

    const routerSide = assignments.get('router')!
    expect(routerSide).toHaveLength(1)
    expect(routerSide[0].portIndex).toBe(0)
    expect(routerSide[0].connectedTo).toBe('a')
  })

  it('greedy still works on devices without a port map', () => {
    const sw = buildDevice({ id: 'sw', interfaces: { ethernet: { count: 4 } } })
    const a = buildDevice({ id: 'a', interfaces: { ethernet: { count: 1 } } })
    const b = buildDevice({ id: 'b', interfaces: { ethernet: { count: 1 } } })

    const assignments = assignPorts(
      [sw, a, b],
      [
        buildConnection({ from: 'sw', to: 'a', type: 'ethernet' }),
        buildConnection({ from: 'sw', to: 'b', type: 'ethernet' }),
      ],
    )

    const swSide = assignments.get('sw')!
    expect(swSide).toHaveLength(2)
    expect(swSide[0].portIndex).toBe(0)
    expect(swSide[1].portIndex).toBe(1)
  })

  it("copies Connection.bundle onto each member's PortAssignment", () => {
    const router = buildDeviceWithLabelledPorts()
    const sw = buildDevice({
      id: 'switch',
      interfaces: { sfp: { count: 2, ports: [{ label: 'SFP+ 1' }, { label: 'SFP+ 2' }] } },
    })

    const assignments = assignPorts(
      [router, sw],
      [
        buildConnection({
          from: 'router',
          to: 'switch',
          fromPort: 'SFP+ 1',
          toPort: 'SFP+ 1',
          type: 'sfp',
          bundle: 'trunk-1',
        }),
        buildConnection({
          from: 'router',
          to: 'switch',
          fromPort: 'SFP+ 2',
          toPort: 'SFP+ 2',
          type: 'sfp',
          bundle: 'trunk-1',
        }),
      ],
    )

    const routerSide = assignments.get('router')!
    expect(routerSide.every((a) => a.bundle === 'trunk-1')).toBe(true)
    expect(routerSide).toHaveLength(2)

    const switchSide = assignments.get('switch')!
    expect(switchSide.every((a) => a.bundle === 'trunk-1')).toBe(true)
  })
})

// ─── Ethernet row wrapping ─────────────────────────────────────────

describe('getEthernetRowCount', () => {
  it('needs zero rows when there are no ethernet ports', () => {
    expect(getEthernetRowCount(0, 300)).toBe(0)
  })

  it('fits within a single row when the count fits the first row exactly', () => {
    expect(getEthernetRowCount(12, 300)).toBe(1)
  })

  it('needs a second row once the count exceeds one row', () => {
    expect(getEthernetRowCount(13, 300)).toBe(2)
    expect(getEthernetRowCount(24, 300)).toBe(2)
  })

  it('caps at two rows for very high port counts (overflow renders as a badge instead)', () => {
    expect(getEthernetRowCount(100, 300)).toBe(2)
  })
})

describe('needsSecondaryPortRow', () => {
  it('is false when there is no ethernet to contend with', () => {
    expect(needsSecondaryPortRow(0, 4, false, 300)).toBe(false)
  })

  it('is false when there is nothing secondary to place', () => {
    expect(needsSecondaryPortRow(24, 0, false, 300)).toBe(false)
  })

  it('is false when a small ethernet count leaves room for SFP beside it', () => {
    expect(needsSecondaryPortRow(4, 4, false, 300)).toBe(false)
  })

  it('is true when a wide ethernet row leaves no room for SFP (the reported bug)', () => {
    expect(needsSecondaryPortRow(24, 4, false, 300)).toBe(true)
  })

  it('is true when a wide ethernet row leaves no room for WiFi', () => {
    expect(needsSecondaryPortRow(24, 0, true, 300)).toBe(true)
  })
})
