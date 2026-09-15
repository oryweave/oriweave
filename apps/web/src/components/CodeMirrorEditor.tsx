import { autocompletion } from '@codemirror/autocomplete'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view'
import { lintGutter, linter, forceLinting, type Diagnostic } from '@codemirror/lint'
import React, { useRef, useEffect } from 'react'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  syntaxHighlighting,
  bracketMatching,
  foldGutter,
  HighlightStyle,
} from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { yaml } from '@codemirror/lang-yaml'
import type { ValidationError } from '@oriweave/core'
import { colors, fonts } from '@oriweave/renderer'
import { indentRainbow } from '../lib/indentRainbow'
import { resolveErrorPositions } from '../lib/errorPositions'

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onCursorChange?: (line: number) => void
  errors?: ValidationError[]
}

const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
    fontFamily: fonts.mono,
    backgroundColor: 'transparent',
  },
  '.cm-content': {
    caretColor: colors.primary,
    padding: '16px 0',
  },
  '.cm-cursor': {
    borderLeftColor: colors.primary,
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: colors.primary,
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: `${colors.primaryDim} !important`,
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: '1px solid rgba(255, 152, 0, 0.08)',
    color: '#546e7a',
    minWidth: '40px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 152, 0, 0.06)',
    color: '#b0bec5',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 152, 0, 0.04)',
  },
  '.cm-foldGutter .cm-gutterElement': {
    color: '#546e7a',
    cursor: 'pointer',
  },
  '.cm-line': {
    padding: '0 16px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-scroller::-webkit-scrollbar': {
    width: '6px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    background: colors.primaryDim,
    borderRadius: '3px',
  },
})

// Syntax colors not backed by a brand token (e.g. tags.string, tags.comment) are
// deliberate one-off differentiation for code highlighting, not UI drift.
const highlightColors = HighlightStyle.define([
  { tag: tags.keyword, color: colors.primary, fontWeight: 'bold' },
  { tag: tags.atom, color: colors.purple },
  { tag: tags.bool, color: colors.purple },
  { tag: tags.null, color: colors.textSecondary },
  { tag: tags.number, color: colors.amber },
  { tag: tags.string, color: '#a5d6a7' },
  { tag: tags.comment, color: '#546e7a', fontStyle: 'italic' },
  { tag: tags.meta, color: '#90a4ae' },
  { tag: tags.propertyName, color: colors.primaryLight },
  { tag: tags.definition(tags.propertyName), color: colors.primaryLight },
  { tag: tags.typeName, color: colors.amber },
  { tag: tags.punctuation, color: colors.textSecondary },
  { tag: tags.separator, color: colors.textSecondary },
  { tag: tags.operator, color: colors.textSecondary },
  { tag: tags.variableName, color: colors.textPrimary },
  { tag: tags.content, color: colors.textPrimary },
  { tag: tags.name, color: colors.primaryLight },
])

const syntaxColors = EditorView.theme({
  // YAML keys
  '.cm-propertyName': { color: colors.primary },
  '.cm-string': { color: colors.green },
  '.cm-number': { color: colors.amber },
  '.cm-bool': { color: colors.purple },
  '.cm-null': { color: colors.textSecondary },
  '.cm-comment': { color: colors.textMuted },
  '.cm-meta': { color: colors.textSecondary },
  '.cm-punctuation': { color: '#546e7a' },
  '.cm-atom': { color: colors.purple },
  '.cm-keyword': { color: colors.primary },
  '.cm-typeName': { color: colors.amber },
  '.cm-definition': { color: colors.primary },
})

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  onCursorChange,
  errors,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onCursorChangeRef = useRef(onCursorChange)
  onCursorChangeRef.current = onCursorChange
  const errorsRef = useRef<ValidationError[]>(errors ?? [])
  errorsRef.current = errors ?? []

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
      if (update.selectionSet || update.docChanged) {
        const line = update.state.doc.lineAt(update.state.selection.main.head).number
        onCursorChangeRef.current?.(line)
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        bracketMatching(),
        highlightSelectionMatches(),
        autocompletion(),
        linter((view): Diagnostic[] => {
          const currentErrors = errorsRef.current
          if (currentErrors.length === 0) return []
          const text = view.state.doc.toString()
          const positions = resolveErrorPositions(text, currentErrors)
          return currentErrors.map((error, i) => ({
            from: positions[i].from,
            to: positions[i].to,
            severity: error.severity,
            message: error.message,
          }))
        }),
        lintGutter(),
        yaml(),
        indentRainbow,
        syntaxHighlighting(highlightColors),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        theme,
        syntaxColors,
        updateListener,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (value !== currentContent) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      })
    }
  }, [value])

  // errorsRef is updated above on every render, but CodeMirror's own linter only
  // re-runs on doc changes — force a re-lint whenever the errors themselves change
  // (from parent re-validation) so squiggles never lag behind the error panel/status bar.
  useEffect(() => {
    if (viewRef.current) forceLinting(viewRef.current)
  }, [errors])

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflow: 'hidden',
      }}
    />
  )
}
