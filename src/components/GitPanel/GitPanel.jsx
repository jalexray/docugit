import { useState, useEffect } from 'react'
import StatusList from './StatusList'
import CommitForm from './CommitForm'
import PushButton from './PushButton'
import BranchSelector from './BranchSelector'

export default function GitPanel({ gitStatus, onRefresh, onRefreshFiles }) {
  const [message, setMessage] = useState('')
  const [pushRefreshKey, setPushRefreshKey] = useState(0)

  const handleAfterCommit = () => {
    onRefresh()
    onRefreshFiles()
    setPushRefreshKey((k) => k + 1)
  }

  if (!gitStatus) {
    return (
      <div className="p-3 text-xs text-gray-400">Loading git status...</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Branch */}
      <div className="px-3 py-2 border-b border-gray-200">
        <BranchSelector
          currentBranch={gitStatus.branch}
          onRefresh={onRefresh}
        />
      </div>

      {/* Status lists */}
      <div className="flex-1 overflow-y-auto">
        <StatusList
          gitStatus={gitStatus}
          onRefresh={onRefresh}
        />
      </div>

      {/* Commit + Push */}
      <div className="border-t border-gray-200">
        <CommitForm
          message={message}
          setMessage={setMessage}
          gitStatus={gitStatus}
          onRefresh={handleAfterCommit}
          onRefreshFiles={onRefreshFiles}
        />
        <PushButton onRefresh={onRefresh} refreshKey={pushRefreshKey} />
      </div>
    </div>
  )
}
