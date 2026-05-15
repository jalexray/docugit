import { invoke } from '@tauri-apps/api/core'

// Config
export const getConfig = () => invoke('get_config')
export const setConfig = (repoPath) => invoke('set_config', { repoPath })

// Discovery
export const discoverRepos = (path) => invoke('discover_repos', { path })
export const detectRepo = (path) => invoke('detect_repo', { path })

// Browse filesystem
export const browse = (path) => invoke('browse_dir', { path: path || '~' })

// Open doc (detect repo + resolve relative path + read content in one call)
export const openDoc = (path) => invoke('open_doc', { path })

// Files
export const getFiles = () => invoke('list_files')
export const getFile = (filepath) => invoke('read_file', { filepath })
export const saveFile = (filepath, content) => invoke('save_file', { filepath, content })
export const createFile = (filepath) => invoke('create_file', { filepath })

// Git
export const getGitStatus = () => invoke('git_status')
export const getGitBranches = () => invoke('git_branches')
export const createBranch = (name) => invoke('create_branch', { name })
export const checkoutBranch = (name) => invoke('checkout_branch', { name })
export const getGitDiff = (path) => invoke('git_diff', { path: path || null })
export const stageFiles = (paths) => invoke('stage_files', { paths })
export const unstageFiles = (paths) => invoke('unstage_files', { paths })
export const gitCommit = (message) => invoke('git_commit', { message })
export const gitUnpushed = () => invoke('git_unpushed')
export const gitPush = () => invoke('git_push')
export const gitLog = (limit = 20) => invoke('git_log', { limit })

// Terminal
export const ptySpawn = () => invoke('pty_spawn')
export const ptyWrite = (data) => invoke('pty_write', { data })
export const ptyResize = (cols, rows) => invoke('pty_resize', { cols, rows })
export const ptyKill = () => invoke('pty_kill')
