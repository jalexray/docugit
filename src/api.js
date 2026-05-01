const BASE = '/api/repo'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`)
  }
  return data
}

// Config
export const getConfig = () => request('/config')
export const setConfig = (repoPath) =>
  request('/config', { method: 'POST', body: JSON.stringify({ repo_path: repoPath }) })

// Discovery
export const discoverRepos = (path) =>
  request(`/discover?path=${encodeURIComponent(path)}`)
export const detectRepo = (path) =>
  request(`/detect?path=${encodeURIComponent(path)}`)

// Browse filesystem
export const browse = (path) =>
  request(`/browse?path=${encodeURIComponent(path || '~')}`)

// Open doc (detect repo + resolve relative path + read content in one call)
export const openDoc = (path) =>
  request(`/open-doc?path=${encodeURIComponent(path)}`)

// Files
export const getFiles = () => request('/files')
export const getFile = (filepath) => request(`/files/${filepath}`)
export const saveFile = (filepath, content) =>
  request(`/files/${filepath}`, { method: 'PUT', body: JSON.stringify({ content }) })
export const createFile = (filepath) =>
  request(`/files/${filepath}`, { method: 'POST', body: JSON.stringify({}) })

// Git
export const getGitStatus = () => request('/git/status')
export const getGitBranches = () => request('/git/branches')
export const createBranch = (name) =>
  request('/git/branches', { method: 'POST', body: JSON.stringify({ name }) })
export const checkoutBranch = (name) =>
  request('/git/checkout', { method: 'POST', body: JSON.stringify({ name }) })
export const getGitDiff = (path) =>
  request(`/git/diff${path ? `?path=${encodeURIComponent(path)}` : ''}`)
export const stageFiles = (paths) =>
  request('/git/stage', { method: 'POST', body: JSON.stringify({ paths }) })
export const unstageFiles = (paths) =>
  request('/git/unstage', { method: 'POST', body: JSON.stringify({ paths }) })
export const gitCommit = (message) =>
  request('/git/commit', { method: 'POST', body: JSON.stringify({ message }) })
export const gitUnpushed = () => request('/git/unpushed')
export const gitPush = () =>
  request('/git/push', { method: 'POST' })
export const gitLog = (limit = 20) =>
  request(`/git/log?limit=${limit}`)
