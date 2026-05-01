import { useState } from 'react'
import RepoPicker from './RepoPicker'
import FileTree from './FileTree'

export default function Sidebar({
  repoPath,
  files,
  activeFilePath,
  onSetRepo,
  onClearRepo,
  onOpenFile,
  onOpenDoc,
  onCreateFile,
}) {
  const [showNewFile, setShowNewFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  const handleCreateFile = (e) => {
    e.preventDefault()
    let name = newFileName.trim()
    if (!name) return
    if (!name.endsWith('.md')) name += '.md'
    onCreateFile(name)
    setNewFileName('')
    setShowNewFile(false)
  }

  return (
    <div className="flex flex-col h-full">
      <RepoPicker repoPath={repoPath} onSetRepo={onSetRepo} onClearRepo={onClearRepo} onOpenDoc={onOpenDoc} />

      {repoPath && (
        <>
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Files</span>
            <button
              onClick={() => setShowNewFile(!showNewFile)}
              className="text-xs text-gray-400 hover:text-gray-600"
              title="New file"
            >
              + New
            </button>
          </div>

          {showNewFile && (
            <form onSubmit={handleCreateFile} className="px-3 py-2 border-b border-gray-200">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.md"
                autoFocus
                className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-400"
              />
              <div className="flex gap-1 mt-1">
                <button
                  type="submit"
                  disabled={!newFileName.trim()}
                  className="text-xs px-2 py-0.5 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewFile(false); setNewFileName('') }}
                  className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto">
            <FileTree
              files={files}
              activeFilePath={activeFilePath}
              onOpenFile={onOpenFile}
            />
          </div>
        </>
      )}
    </div>
  )
}
