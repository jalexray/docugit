import { useState } from 'react'
import * as api from '../../api'
import FileBrowser from './FileBrowser'

export default function RepoPicker({ repoPath, onSetRepo, onClearRepo, onOpenDoc }) {
  const [mode, setMode] = useState('doc') // 'doc' | 'path' | 'scan' | 'detect'
  const [input, setInput] = useState('')
  const [repos, setRepos] = useState([])
  const [scanning, setScanning] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)

  const handleSubmitPath = (e) => {
    e.preventDefault()
    if (input.trim()) onSetRepo(input.trim())
  }

  const handleScan = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setScanning(true)
    try {
      const data = await api.discoverRepos(input.trim())
      setRepos(data.repos || [])
    } catch (err) {
      setRepos([])
    } finally {
      setScanning(false)
    }
  }

  const handleDetect = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    try {
      const data = await api.detectRepo(input.trim())
      if (data.repo_path) onSetRepo(data.repo_path)
    } catch {
      // error handled by parent
    }
  }

  const handleBrowseSelect = (filePath) => {
    setShowBrowser(false)
    if (onOpenDoc) onOpenDoc(filePath)
  }

  if (repoPath) {
    return (
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Repo</span>
          <button
            onClick={onClearRepo}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Change repo"
          >
            Change
          </button>
        </div>
        <p className="text-xs text-gray-600 truncate mt-1" title={repoPath}>
          {repoPath.split('/').slice(-2).join('/')}
        </p>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 border-b border-gray-200">
      <div className="flex gap-1 mb-2">
        {[
          ['doc', 'Doc'],
          ['path', 'Path'],
          ['scan', 'Scan'],
          ['detect', 'Detect'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setRepos([]) }}
            className={`text-xs px-2 py-0.5 rounded ${
              mode === key
                ? 'bg-gray-700 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'doc' ? (
        <button
          onClick={() => setShowBrowser(true)}
          className="w-full text-xs px-2 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800"
        >
          Browse for Document...
        </button>
      ) : (
        <form onSubmit={mode === 'scan' ? handleScan : mode === 'detect' ? handleDetect : handleSubmitPath}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'path' ? '/path/to/repo'
              : mode === 'scan' ? '/parent/directory'
              : '/path/to/any/file'
            }
            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || scanning}
            className="mt-1.5 w-full text-xs px-2 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {mode === 'scan' ? (scanning ? 'Scanning...' : 'Scan') : mode === 'detect' ? 'Detect' : 'Open'}
          </button>
        </form>
      )}

      {/* Scan results */}
      {repos.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto">
          {repos.map((repo) => (
            <button
              key={repo.path}
              onClick={() => onSetRepo(repo.path)}
              className="w-full text-left text-xs px-2 py-1 hover:bg-gray-200 rounded truncate block"
              title={repo.path}
            >
              {repo.name}
            </button>
          ))}
        </div>
      )}

      {/* File browser modal */}
      {showBrowser && (
        <FileBrowser
          onSelect={handleBrowseSelect}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </div>
  )
}
