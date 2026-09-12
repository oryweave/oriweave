import type { Device } from '@oriweave/core'

/**
 * Builds a flat Map of devices indexed by their ID for O(1) lookup.
 * Recursively traverses the device tree including all children.
 *
 * @param devices - Array of devices (may be nested with children)
 * @returns Map where keys are device IDs and values are Device objects
 */
export function buildDeviceMap(devices: Device[]): Map<string, Device> {
  const map = new Map<string, Device>()

  const walk = (devs: Device[]) => {
    for (const d of devs) {
      map.set(d.id, d)
      if (d.children) walk(d.children)
    }
  }
  walk(devices)

  return map
}
