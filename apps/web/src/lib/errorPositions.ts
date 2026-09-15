import { parseDocument, isMap, isSeq, isScalar, type Node } from 'yaml'
import type { ValidationError } from '@oriweave/core'

export interface ErrorPosition {
  from: number
  to: number
}

// core's ValidationError.path is a hand-built string like "devices[0].children[2].name"
// or "" for root-level errors — split it into the key/index sequence `getIn` expects.
function parsePath(path: string): (string | number)[] {
  if (!path) return []
  const segments: (string | number)[] = []
  const re = /([^.[\]]+)|\[(\d+)\]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(path))) {
    segments.push(match[1] !== undefined ? match[1] : Number(match[2]))
  }
  return segments
}

function nodeRange(node: unknown): [number, number] | null {
  if (isMap(node) || isSeq(node) || isScalar(node)) {
    const range = (node as Node).range
    if (range) return [range[0], range[1]]
  }
  return null
}

// This is a *second*, editor-only parse of the same yaml text, independent of core's
// parse()/validate() pipeline — core uses js-yaml, which discards source positions once
// loaded, so there's nothing there to map a ValidationError.path back to. Only used to
// place squiggles; never feeds into validation logic itself.
export function resolveErrorPositions(
  yamlText: string,
  errors: ValidationError[],
): ErrorPosition[] {
  let doc: ReturnType<typeof parseDocument>
  try {
    doc = parseDocument(yamlText)
  } catch {
    return errors.map(() => ({ from: 0, to: Math.min(yamlText.length, 1) }))
  }

  return errors.map((error) => {
    const segments = parsePath(error.path)

    // Walk from the full path up to the root until something actually resolves —
    // covers "missing required field" errors, whose path points at a key that by
    // definition isn't present in the document.
    for (let depth = segments.length; depth >= 0; depth--) {
      const prefix = segments.slice(0, depth)
      const target = prefix.length === 0 ? doc.contents : doc.getIn(prefix, true)
      const range = nodeRange(target)
      if (range) {
        const [from, valueEnd] = range
        return { from, to: Math.max(valueEnd, from + 1) }
      }
    }

    return { from: 0, to: Math.min(yamlText.length, 1) }
  })
}
