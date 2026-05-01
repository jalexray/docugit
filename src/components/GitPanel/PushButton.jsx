import { useState, useEffect } from 'react'
import * as api from '../../api'

export default function PushButton({ onRefresh, refreshKey }) {
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState(null)
  const [unpushed, setUnpushed] = useState([])
  const [loading, setLoading] = useState(false)

  const loadUnpushed = async () => {
    setLoading(true)
    try {
      const data = await api.gitUnpushed()
      setUnpushed(data.commits || [])
    } catch {
      setUnpushed([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUnpushed()
  }, [])

  // Refresh unpushed list after commits
  useEffect(() => {
    loadUnpushed()
  }, [refreshKey])

  const handlePush = async () => {
    setPushing(true)
    setResult(null)
    try {
      await api.gitPush()
      setResult({ type: 'success', text: 'Pushed successfully' })
      setUnpushed([])
      onRefresh()
    } catch (err) {
      setResult({ type: 'error', text: err.message })
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="px-3 py-2 border-t border-gray-200">
      {/* Unpushed commits preview */}
      {unpushed.length > 0 && (
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Unpushed ({unpushed.length})
          </span>
          <div className="mt-1 max-h-32 overflow-y-auto">
            {unpushed.map((commit) => (
              <div key={commit.sha} className="flex items-start gap-1.5 py-0.5 text-xs">
                <span className="text-gray-400 font-mono shrink-0">{commit.sha}</span>
                <span className="text-gray-700 truncate">{commit.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && unpushed.length === 0 && !result && (
        <p className="text-xs text-gray-400 mb-2">Nothing to push</p>
      )}

      <button
        onClick={handlePush}
        disabled={pushing || unpushed.length === 0}
        className="w-full text-xs px-2 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {pushing ? 'Pushing...' : `Push${unpushed.length > 0 ? ` (${unpushed.length})` : ''}`}
      </button>
      {result && (
        <p className={`text-xs mt-1 ${result.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {result.text}
        </p>
      )}
    </div>
  )
}
