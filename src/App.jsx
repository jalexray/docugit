import { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import Sidebar from './components/Sidebar/Sidebar'
import Editor from './components/Editor/Editor'
import EmptyState from './components/Editor/EmptyState'
import GitPanel from './components/GitPanel/GitPanel'
import TerminalPanel from './components/Terminal/TerminalPanel'
import * as api from './tauri-api'

function findInTree(tree, predicate) {
  for (const item of tree) {
    if (item.type === 'file' && predicate(item)) return item.path
    if (item.type === 'directory' && item.children) {
      const found = findInTree(item.children, predicate)
      if (found) return found
    }
  }
  return null
}

function App() {
  const [repoPath, setRepoPath] = useState(null)
  const [hasGit, setHasGit] = useState(false)
  const [files, setFiles] = useState([])
  const [activeFilePath, setActiveFilePath] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [gitStatus, setGitStatus] = useState(null)
  const [showSidebar, setShowSidebar] = useState(
    () => localStorage.getItem('docugit:showSidebar') !== 'false'
  )
  const [showGitPanel, setShowGitPanel] = useState(
    () => localStorage.getItem('docugit:showGitPanel') !== 'false'
  )
  const [showTerminal, setShowTerminal] = useState(false)
  const [terminalMounted, setTerminalMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    localStorage.setItem('docugit:showSidebar', showSidebar)
  }, [showSidebar])

  useEffect(() => {
    localStorage.setItem('docugit:showGitPanel', showGitPanel)
  }, [showGitPanel])

  // Load saved config on mount
  useEffect(() => {
    api.getConfig().then(data => {
      if (data.repo_path) {
        setRepoPath(data.repo_path)
        setHasGit(!!data.has_git)
      }
    }).catch(() => {})
  }, [])

  // Load file tree when repo changes, then auto-open last file or README
  useEffect(() => {
    if (!repoPath) return
    api.getFiles().then(data => {
      const tree = data.tree || []
      setFiles(tree)

      // Don't auto-open if a file is already active
      if (activeFilePath) return

      const lastPath = localStorage.getItem('docugit:lastFile')
      const lastExists = lastPath && findInTree(tree, f => f.path === lastPath)
      const readme = findInTree(tree, f => /^readme\.md$/i.test(f.name))
      const toOpen = lastExists || readme
      if (toOpen) handleOpenFile(toOpen)
    }).catch(err => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath])

  // Refresh git status when repo changes or after actions
  const refreshGitStatus = useCallback(() => {
    if (!repoPath || !hasGit) return
    api.getGitStatus().then(setGitStatus).catch(() => {})
  }, [repoPath, hasGit])

  useEffect(() => {
    refreshGitStatus()
  }, [refreshGitStatus])

  // macOS: show dot on close button when document has unsaved changes
  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().setDocumentEdited(isDirty).catch(() => {})
    }).catch(() => {})
  }, [isDirty])

  const handleSetRepo = async (path) => {
    try {
      setError(null)
      const data = await api.setConfig(path)
      if (data.valid) {
        setRepoPath(data.repo_path)
        setHasGit(!!data.has_git)
        setActiveFilePath(null)
        setFileContent('')
        setIsDirty(false)
      } else {
        setError(data.error || 'Invalid repo path')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleClearRepo = () => {
    setRepoPath(null)
    setHasGit(false)
    setFiles([])
    setActiveFilePath(null)
    setFileContent('')
    setIsDirty(false)
    setGitStatus(null)
  }

  const handleOpenFile = async (filepath) => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) {
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await api.getFile(filepath)
      setActiveFilePath(filepath)
      setFileContent(data.content)
      setIsDirty(false)
      localStorage.setItem('docugit:lastFile', filepath)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = useCallback(async (markdown) => {
    if (!activeFilePath) return
    try {
      setError(null)
      await api.saveFile(activeFilePath, markdown)
      setFileContent(markdown)
      setIsDirty(false)
      refreshGitStatus()
    } catch (err) {
      setError(err.message)
    }
  }, [activeFilePath, refreshGitStatus])

  const handleOpenDoc = async (filePath) => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) {
      return
    }
    try {
      setError(null)
      setLoading(true)
      const data = await api.openDoc(filePath)
      // Update repo if changed
      setHasGit(!!data.has_git)
      if (data.repo_path !== repoPath) {
        setRepoPath(data.repo_path)
        const filesData = await api.getFiles()
        setFiles(filesData.tree || [])
      }
      setActiveFilePath(data.relative_path)
      setFileContent(data.content)
      setIsDirty(false)
      localStorage.setItem('docugit:lastFile', data.relative_path)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFile = async (filepath) => {
    try {
      setError(null)
      await api.createFile(filepath)
      // Refresh file tree
      const data = await api.getFiles()
      setFiles(data.tree || [])
      // Open the new file
      await handleOpenFile(filepath)
    } catch (err) {
      setError(err.message)
    }
  }

  const refreshFiles = async () => {
    if (!repoPath) return
    try {
      const data = await api.getFiles()
      setFiles(data.tree || [])
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Layout
      sidebar={
        <Sidebar
          repoPath={repoPath}
          files={files}
          activeFilePath={activeFilePath}
          onSetRepo={handleSetRepo}
          onClearRepo={handleClearRepo}
          onOpenFile={handleOpenFile}
          onOpenDoc={handleOpenDoc}
          onCreateFile={handleCreateFile}
        />
      }
      editor={
        activeFilePath ? (
          <Editor
            key={activeFilePath}
            content={fileContent}
            isDirty={isDirty}
            onDirtyChange={setIsDirty}
            onSave={handleSave}
            filePath={activeFilePath}
          />
        ) : (
          <EmptyState />
        )
      }
      gitPanel={
        showGitPanel && repoPath && hasGit ? (
          <GitPanel
            gitStatus={gitStatus}
            onRefresh={refreshGitStatus}
            onRefreshFiles={refreshFiles}
          />
        ) : null
      }
      terminalPanel={
        terminalMounted && repoPath ? (
          <TerminalPanel onClose={() => setShowTerminal(false)} />
        ) : null
      }
      showSidebar={showSidebar}
      onToggleSidebar={() => setShowSidebar(!showSidebar)}
      showGitPanel={showGitPanel}
      onToggleGitPanel={() => setShowGitPanel(!showGitPanel)}
      showTerminal={showTerminal}
      onToggleTerminal={() => {
        const next = !showTerminal
        setShowTerminal(next)
        if (next) setTerminalMounted(true)
      }}
      error={error}
      onDismissError={() => setError(null)}
      repoPath={repoPath}
      hasGit={hasGit}
    />
  )
}

export default App
