import { useState } from 'react'
import * as api from '../../api'

export default function CommitForm({ message, setMessage, gitStatus, onRefresh, onRefreshFiles }) {
  const [committing, setCommitting] = useState(false)
  const [result, setResult] = useState(null)

  const canCommit = message.trim() && gitStatus.staged.length > 0

  const handleCommit = async () => {
    if (!canCommit) return
    setCommitting(true)
    setResult(null)
    try {
      const data = await api.gitCommit(message.trim())
      setResult({ type: 'success', text: `Committed ${data.sha}` })
      setMessage('')
      onRefresh()
      onRefreshFiles()
    } catch (err) {
      setResult({ type: 'error', text: err.message })
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="px-3 py-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message..."
        rows={2}
        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded resize-none focus:outline-none focus:border-blue-400"
      />
      <button
        onClick={handleCommit}
        disabled={!canCommit || committing}
        className="w-full mt-1 text-xs px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {committing ? 'Committing...' : `Commit (${gitStatus.staged.length} file${gitStatus.staged.length !== 1 ? 's' : ''})`}
      </button>
      {result && (
        <p className={`text-xs mt-1 ${result.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {result.text}
        </p>
      )}
    </div>
  )
}
