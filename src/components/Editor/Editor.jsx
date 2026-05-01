import { useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Toolbar from './Toolbar'

export default function Editor({ content, isDirty, onDirtyChange, onSave, filePath }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: content,
    contentType: 'markdown',
    onUpdate: () => {
      onDirtyChange(true)
    },
  })

  // Cmd/Ctrl+S to save
  const handleSave = useCallback(() => {
    if (!editor) return
    const md = editor.getMarkdown()
    onSave(md)
  }, [editor, onSave])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  if (!editor) return null

  return (
    <div className="flex flex-col h-full">
      <Toolbar editor={editor} onSave={handleSave} isDirty={isDirty} filePath={filePath} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="tiptap prose prose-lg max-w-none" />
      </div>
    </div>
  )
}
