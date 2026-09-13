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
import { lintGutter } from '@codemirror/lint'
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

interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  onCursorChange?: (line: number) => void
}

const theme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    backgroundColor: 'transparent',
  },
  '.cm-content': {
    caretColor: '#26C6DA',
    padding: '16px 0',
  },
  '.cm-cursor': {
    borderLeftColor: '#26C6DA',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#26C6DA',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(38, 198, 218, 0.15) !important',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: '1px solid rgba(38, 198, 218, 0.08)',
    color: '#546e7a',
    minWidth: '40px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(38, 198, 218, 0.06)',
    color: '#b0bec5',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(38, 198, 218, 0.04)',
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
    background: 'rgba(38, 198, 218, 0.15)',
    borderRadius: '3px',
  },
})

const highlightColors = HighlightStyle.define([
  { tag: tags.keyword, color: '#26C6DA', fontWeight: 'bold' },
  { tag: tags.atom, color: '#d500f9' },
  { tag: tags.bool, color: '#d500f9' },
  { tag: tags.null, color: '#8B949E' },
  { tag: tags.number, color: '#FF9800' },
  { tag: tags.string, color: '#a5d6a7' },
  { tag: tags.comment, color: '#546e7a', fontStyle: 'italic' },
  { tag: tags.meta, color: '#90a4ae' },
  { tag: tags.propertyName, color: '#4dd0e1' },
  { tag: tags.definition(tags.propertyName), color: '#4dd0e1' },
  { tag: tags.typeName, color: '#FF9800' },
  { tag: tags.punctuation, color: '#8B949E' },
  { tag: tags.separator, color: '#8B949E' },
  { tag: tags.operator, color: '#8B949E' },
  { tag: tags.variableName, color: '#E0E0E0' },
  { tag: tags.content, color: '#E0E0E0' },
  { tag: tags.name, color: '#4dd0e1' },
])

const syntaxColors = EditorView.theme({
  // YAML keys
  '.cm-propertyName': { color: '#26C6DA' },
  '.cm-string': { color: '#00e676' },
  '.cm-number': { color: '#FF9800' },
  '.cm-bool': { color: '#d500f9' },
  '.cm-null': { color: '#8B949E' },
  '.cm-comment': { color: '#6E7681' },
  '.cm-meta': { color: '#8B949E' },
  '.cm-punctuation': { color: '#546e7a' },
  '.cm-atom': { color: '#d500f9' },
  '.cm-keyword': { color: '#26C6DA' },
  '.cm-typeName': { color: '#FF9800' },
  '.cm-definition': { color: '#26C6DA' },
})

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  onCursorChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onCursorChangeRef = useRef(onCursorChange)
  onCursorChangeRef.current = onCursorChange

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
        lintGutter(),
        yaml(),
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
