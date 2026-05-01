import { useState, useEffect } from 'react'
import * as api from '../../api'

export default function FileBrowser({ onSelect, onClose }) {
  const [currentPath, setCurrentPath] = useState('~')
  const [parentPath, setParentPath] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadDir = async (path) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.browse(path)
      setCurrentPath(data.path)
      setParentPath(data.parent)
      setItems(data.items)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDir('~')
  }, [])

  const handleClick = (item) => {
    if (item.type === 'directory') {
      loadDir(currentPath + '/' + item.name)
    } else {
      onSelect(currentPath + '/' + item.name)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Open Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
        </div>

        {/* Path bar */}
        <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-200">
          {parentPath && parentPath !== currentPath && (
            <button
              onClick={() => loadDir(parentPath)}
              className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 shrink-0"
            >
              Up
            </button>
          )}
          <span className="text-xs text-gray-500 truncate" title={currentPath}>{currentPath}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 text-xs text-red-600 bg-red-50">{error}</div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-xs text-gray-400 text-center">Loading...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-xs text-gray-400 text-center">No markdown files or folders here</div>
          ) : (
            <div className="py-1">
              {items.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleClick(item)}
                  className="w-full text-left flex items-center gap-2 px-4 py-1.5 hover:bg-blue-50 text-sm"
                >
                  <span className="text-gray-400 w-4 text-center shrink-0">
                    {item.type === 'directory' ? '\uD83D\uDCC1' : '\uD83D\uDCC4'}
                  </span>
                  <span className={item.type === 'directory' ? 'text-gray-700' : 'text-blue-700'}>
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
