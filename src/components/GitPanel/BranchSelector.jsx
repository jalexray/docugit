import { useState, useEffect } from 'react'
import * as api from '../../api'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export default function BranchSelector({ currentBranch, onRefresh }) {
  const [branches, setBranches] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadBranches = async () => {
    try {
      const data = await api.getGitBranches()
      setBranches(data.branches || [])
    } catch {
      setBranches([])
    }
  }

  useEffect(() => {
    if (showDropdown) loadBranches()
  }, [showDropdown])

  const handleSwitch = async (name) => {
    if (name === currentBranch) return
    setLoading(true)
    setError(null)
    try {
      await api.checkoutBranch(name)
      setShowDropdown(false)
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.createBranch(newName.trim())
      setNewName('')
      setShowCreate(false)
      setShowDropdown(false)
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 text-xs hover:bg-gray-200 rounded px-1 py-0.5"
        >
          <span className="text-gray-500">Branch:</span>
          <span className="font-medium text-gray-700">{currentBranch}</span>
          <span className="text-gray-400">{showDropdown ? '\u25B4' : '\u25BE'}</span>
        </button>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-400 hover:text-gray-600"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-10">
          {/* Branch list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {branches.map((b) => (
              <button
                key={b.name}
                onClick={() => handleSwitch(b.name)}
                disabled={loading}
                className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 ${
                  b.name === currentBranch ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs truncate ${
                    b.name === currentBranch ? 'font-medium text-blue-700' : 'text-gray-700'
                  }`}>
                    {b.name}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {timeAgo(b.last_commit_date)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Create new */}
          <div className="border-t border-gray-200 px-2 py-1.5">
            {showCreate ? (
              <form onSubmit={handleCreate} className="flex gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="new-branch-name"
                  autoFocus
                  className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-400"
                />
                <button
                  type="submit"
                  disabled={!newName.trim() || loading}
                  className="text-xs px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  Create
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full text-left text-xs text-blue-600 hover:text-blue-700 px-1"
              >
                + New branch
              </button>
            )}
          </div>

          {error && (
            <div className="px-2 py-1 text-xs text-red-600 border-t border-gray-200">{error}</div>
          )}
        </div>
      )}
    </div>
  )
}
