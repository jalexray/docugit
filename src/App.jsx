import { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import Sidebar from './components/Sidebar/Sidebar'
import Editor from './components/Editor/Editor'
import EmptyState from './components/Editor/EmptyState'
import GitPanel from './components/GitPanel/GitPanel'
import * as api from './api'

function App() {
  const [repoPath, setRepoPath] = useState(null)
  const [files, setFiles] = useState([])
  const [activeFilePath, setActiveFilePath] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [gitStatus, setGitStatus] = useState(null)
  const [showGitPanel, setShowGitPanel] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load saved config on mount
  useEffect(() => {
    api.getConfig().then(data => {
      if (data.repo_path) {
        setRepoPath(data.repo_path)
      }
    }).catch(() => {})
  }, [])

  // Load file tree when repo changes
  useEffect(() => {
    if (!repoPath) return
    api.getFiles().then(data => setFiles(data.tree || []))
      .catch(err => setError(err.message))
  }, [repoPath])

  // Refresh git status when repo changes or after actions
  const refreshGitStatus = useCallback(() => {
    if (!repoPath) return
    api.getGitStatus().then(setGitStatus).catch(() => {})
  }, [repoPath])

  useEffect(() => {
    refreshGitStatus()
  }, [refreshGitStatus])

  const handleSetRepo = async (path) => {
    try {
      setError(null)
      const data = await api.setConfig(path)
      if (data.valid) {
        setRepoPath(data.repo_path)
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
      if (data.repo_path !== repoPath) {
        setRepoPath(data.repo_path)
        const filesData = await api.getFiles()
        setFiles(filesData.tree || [])
      }
      setActiveFilePath(data.relative_path)
      setFileContent(data.content)
      setIsDirty(false)
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
        showGitPanel && repoPath ? (
          <GitPanel
            gitStatus={gitStatus}
            onRefresh={refreshGitStatus}
            onRefreshFiles={refreshFiles}
          />
        ) : null
      }
      showGitPanel={showGitPanel}
      onToggleGitPanel={() => setShowGitPanel(!showGitPanel)}
      error={error}
      onDismissError={() => setError(null)}
      repoPath={repoPath}
    />
  )
}

export default App
