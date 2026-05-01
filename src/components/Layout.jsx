export default function Layout({
  sidebar,
  editor,
  gitPanel,
  showGitPanel,
  onToggleGitPanel,
  error,
  onDismissError,
  repoPath,
}) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <h1 className="text-sm font-semibold text-gray-700 tracking-wide">DocuGit</h1>
        <div className="flex items-center gap-3">
          {repoPath && (
            <span className="text-xs text-gray-400 truncate max-w-80">{repoPath}</span>
          )}
          {repoPath && (
            <button
              onClick={onToggleGitPanel}
              className={`text-xs px-2 py-1 rounded border ${
                showGitPanel
                  ? 'bg-gray-200 border-gray-300 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Git
            </button>
          )}
        </div>
      </header>

      {/* Error bar */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm flex items-center justify-between shrink-0">
          <span>{error}</span>
          <button onClick={onDismissError} className="text-red-400 hover:text-red-600 ml-4">
            &times;
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          {sidebar}
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {editor}
        </div>

        {/* Git Panel */}
        {gitPanel && (
          <div className="w-80 shrink-0 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            {gitPanel}
          </div>
        )}
      </div>
    </div>
  )
}
