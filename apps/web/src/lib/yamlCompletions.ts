import type {
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete'
import { parseDocument, isMap, isSeq } from 'yaml'
import { DEVICE_TYPES, CONNECTION_TYPES } from '@oriweave/core'

const DEVICE_TYPE_OPTIONS = DEVICE_TYPES.map((type) => ({ label: type, type: 'keyword' }))
const CONNECTION_TYPE_OPTIONS = CONNECTION_TYPES.map((type) => ({ label: type, type: 'keyword' }))

// Which top-level section (devices/connections/networks/...) the cursor's line
// falls under, found by walking up to the nearest column-0 `key:` line. Doesn't
// require the document to be valid YAML at every keystroke — unlike a full CST
// lookup, this only needs *earlier* lines to still look like YAML.
function enclosingTopLevelKey(context: CompletionContext): string | null {
  const { state, pos } = context
  const cursorLine = state.doc.lineAt(pos).number
  for (let n = cursorLine; n >= 1; n--) {
    const match = /^([A-Za-z][\w-]*):/.exec(state.doc.line(n).text)
    if (match) return match[1]
  }
  return null
}

// Second, editor-only parse of the live buffer (same pattern as errorPositions.ts)
// purely to collect known device ids for connections[].from/to completion.
function collectDeviceIds(yamlText: string): string[] {
  let doc: ReturnType<typeof parseDocument>
  try {
    doc = parseDocument(yamlText)
  } catch {
    return []
  }

  const ids: string[] = []
  const walk = (node: unknown) => {
    if (!isSeq(node)) return
    for (const item of node.items) {
      if (!isMap(item)) continue
      const id = item.get('id')
      if (typeof id === 'string') ids.push(id)
      const children = item.get('children', true)
      if (children) walk(children)
    }
  }
  walk(doc.get('devices', true))

  return ids
}

export const yamlValueCompletions: CompletionSource = (
  context: CompletionContext,
): CompletionResult | null => {
  const word = context.matchBefore(/[\w-]*/)
  if (!word) return null
  if (word.from === word.to && !context.explicit) return null

  const line = context.state.doc.lineAt(word.from)
  const prefix = line.text.slice(0, word.from - line.from)

  if (/^\s*type:\s*$/.test(prefix)) {
    const section = enclosingTopLevelKey(context)
    if (section === 'devices') return { from: word.from, options: DEVICE_TYPE_OPTIONS }
    if (section === 'connections') return { from: word.from, options: CONNECTION_TYPE_OPTIONS }
    return null
  }

  if (/^\s*(from|to):\s*$/.test(prefix)) {
    if (enclosingTopLevelKey(context) !== 'connections') return null
    const ids = collectDeviceIds(context.state.doc.toString())
    if (ids.length === 0) return null
    return { from: word.from, options: ids.map((id) => ({ label: id, type: 'variable' })) }
  }

  return null
}
