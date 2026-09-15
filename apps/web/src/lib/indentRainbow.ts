import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { colors } from '@oriweave/renderer'

const INDENT_UNIT = 2
const RAINBOW_COLORS = [colors.primary, colors.networkAccent, colors.green, colors.purple]

const levelMarks = RAINBOW_COLORS.map((hex) =>
  Decoration.mark({
    attributes: { style: `background-color: ${hex}1f;` }, // ~12% alpha
  }),
)

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      const text = line.text

      let indentEnd = 0
      while (indentEnd < text.length && text[indentEnd] === ' ') indentEnd++

      const levels = Math.floor(indentEnd / INDENT_UNIT)
      for (let level = 0; level < levels; level++) {
        const start = line.from + level * INDENT_UNIT
        builder.add(start, start + INDENT_UNIT, levelMarks[level % levelMarks.length])
      }

      pos = line.to + 1
    }
  }

  return builder.finish()
}

export const indentRainbow = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
)
