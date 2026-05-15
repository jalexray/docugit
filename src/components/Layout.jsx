export default function Layout({
  sidebar,
  editor,
  gitPanel,
  terminalPanel,
  showSidebar,
  onToggleSidebar,
  showGitPanel,
  onToggleGitPanel,
  showTerminal,
  onToggleTerminal,
  error,
  onDismissError,
  repoPath,
  hasGit,
}) {
  const toggleClass = (active) =>
    `text-xs px-2 py-1 rounded border ${
      active
        ? 'bg-gray-200 border-gray-300 text-gray-700'
        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
    }`

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-700 tracking-wide">DocuGit</h1>
          {repoPath && (
            <button
              onClick={onToggleSidebar}
              className={`text-xs px-2 py-1 rounded border ${
                showSidebar
                  ? 'bg-gray-200 border-gray-300 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Files
            </button>
          )}
          {repoPath && hasGit && (
            <button
              onClick={onToggleGitPanel}
              className={toggleClass(showGitPanel)}
              title={showGitPanel ? 'Hide git panel' : 'Show git panel'}
            >
              Git
            </button>
          )}
          {repoPath && (
            <button
              onClick={onToggleTerminal}
              className={`text-xs px-2 py-1 rounded border ${
                showTerminal
                  ? 'bg-gray-200 border-gray-300 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Terminal
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {repoPath && (
            <span className="text-xs text-gray-400 truncate max-w-80">{repoPath}</span>
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
        {showSidebar && (
          <div className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            {sidebar}
          </div>
        )}

        {/* Center: editor + terminal stacked vertically */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {editor}
          </div>

          {/* Terminal Panel — kept mounted, hidden via CSS to preserve session */}
          {terminalPanel && (
            <div
              className={`shrink-0 border-t border-gray-600 ${showTerminal ? 'h-72' : 'h-0 overflow-hidden'}`}
            >
              {terminalPanel}
            </div>
          )}
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
