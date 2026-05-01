import { useState } from 'react'
import * as api from '../../api'

function FileRow({ path, type, checked, onChange }) {
  const typeLabel = { A: 'added', M: 'modified', D: 'deleted', R: 'renamed' }
  return (
    <label className="flex items-center gap-1.5 px-3 py-0.5 hover:bg-gray-100 cursor-pointer text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-gray-300"
      />
      <span className="truncate flex-1 text-gray-700">{path}</span>
      {type && (
        <span className="text-gray-400 shrink-0">{typeLabel[type] || type}</span>
      )}
    </label>
  )
}

export default function StatusList({ gitStatus, onRefresh }) {
  const [selectedChanged, setSelectedChanged] = useState(new Set())
  const [selectedStaged, setSelectedStaged] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const allChanged = [
    ...gitStatus.changed.map((f) => ({ ...f, source: 'changed' })),
    ...gitStatus.untracked.map((p) => ({ path: p, type: 'A', source: 'untracked' })),
  ]

  const toggleChanged = (path) => {
    setSelectedChanged((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleStaged = (path) => {
    setSelectedStaged((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleStage = async () => {
    if (selectedChanged.size === 0) return
    setLoading(true)
    try {
      await api.stageFiles([...selectedChanged])
      setSelectedChanged(new Set())
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  const handleUnstage = async () => {
    if (selectedStaged.size === 0) return
    setLoading(true)
    try {
      await api.unstageFiles([...selectedStaged])
      setSelectedStaged(new Set())
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  const handleStageAll = async () => {
    if (allChanged.length === 0) return
    setLoading(true)
    try {
      await api.stageFiles(allChanged.map((f) => f.path))
      setSelectedChanged(new Set())
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Changed / Untracked */}
      {allChanged.length > 0 && (
        <div className="py-1">
          <div className="px-3 py-1 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Changes ({allChanged.length})
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleStageAll}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Stage all
              </button>
              {selectedChanged.size > 0 && (
                <button
                  onClick={handleStage}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  Stage
                </button>
              )}
            </div>
          </div>
          {allChanged.map((f) => (
            <FileRow
              key={f.path}
              path={f.path}
              type={f.type}
              checked={selectedChanged.has(f.path)}
              onChange={() => toggleChanged(f.path)}
            />
          ))}
        </div>
      )}

      {/* Staged */}
      {gitStatus.staged.length > 0 && (
        <div className="py-1">
          <div className="px-3 py-1 flex items-center justify-between">
            <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
              Staged ({gitStatus.staged.length})
            </span>
            {selectedStaged.size > 0 && (
              <button
                onClick={handleUnstage}
                disabled={loading}
                className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Unstage
              </button>
            )}
          </div>
          {gitStatus.staged.map((f) => (
            <FileRow
              key={f.path}
              path={f.path}
              type={f.type}
              checked={selectedStaged.has(f.path)}
              onChange={() => toggleStaged(f.path)}
            />
          ))}
        </div>
      )}

      {allChanged.length === 0 && gitStatus.staged.length === 0 && (
        <div className="px-3 py-4 text-xs text-gray-400 text-center">
          Working tree clean
        </div>
      )}
    </div>
  )
}
