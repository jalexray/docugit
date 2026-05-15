use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

use crate::config;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Serialize)]
pub struct BrowseItem {
    pub name: String,
    #[serde(rename = "type")]
    pub item_type: String,
}

fn safe_path(repo_path: &str, filepath: &str) -> Result<PathBuf, String> {
    let real_repo = fs::canonicalize(repo_path).map_err(|e| e.to_string())?;
    let joined = Path::new(repo_path).join(filepath);
    let real_path = fs::canonicalize(&joined).map_err(|e| e.to_string())?;

    if real_path != real_repo && !real_path.starts_with(real_repo.join("")) {
        return Err("Path traversal detected".to_string());
    }
    Ok(real_path)
}

fn expand_path(path: &str) -> PathBuf {
    if path.starts_with('~') {
        if let Some(home) = dirs::home_dir() {
            return home.join(&path[1..].trim_start_matches('/'));
        }
    }
    PathBuf::from(path)
}

const SKIP_DIRS: &[&str] = &["node_modules", "__pycache__", "venv", ".git", "target"];

fn build_tree(directory: &Path, prefix: &str) -> Vec<FileEntry> {
    let mut items = Vec::new();
    let entries = match fs::read_dir(directory) {
        Ok(e) => e,
        Err(_) => return items,
    };

    let mut sorted_entries: Vec<_> = entries.filter_map(|e| e.ok()).collect();
    sorted_entries.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    for entry in sorted_entries {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        if SKIP_DIRS.contains(&name.as_str()) {
            continue;
        }

        let rel_path = if prefix.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", prefix, name)
        };

        let file_type = entry.file_type();
        let is_dir = file_type.map(|ft| ft.is_dir()).unwrap_or(false);

        if is_dir {
            let children = build_tree(&entry.path(), &rel_path);
            if !children.is_empty() {
                items.push(FileEntry {
                    name,
                    path: rel_path,
                    entry_type: "directory".to_string(),
                    children: Some(children),
                });
            }
        } else if name.to_lowercase().ends_with(".md") {
            items.push(FileEntry {
                name,
                path: rel_path,
                entry_type: "file".to_string(),
                children: None,
            });
        }
    }
    items
}

// --- Tauri commands ---

#[tauri::command]
pub fn list_files() -> Result<serde_json::Value, String> {
    let repo_path = config::get_repo_path().ok_or("No repo configured")?;
    let tree = build_tree(Path::new(&repo_path), "");
    Ok(serde_json::json!({ "tree": tree }))
}

#[tauri::command]
pub fn read_file(filepath: String) -> Result<serde_json::Value, String> {
    let repo_path = config::get_repo_path().ok_or("No repo configured")?;
    let full_path = safe_path(&repo_path, &filepath)?;
    if !full_path.is_file() {
        return Err("File not found".to_string());
    }
    let content = fs::read_to_string(&full_path).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "path": filepath, "content": content }))
}

#[tauri::command]
pub fn save_file(filepath: String, content: String) -> Result<serde_json::Value, String> {
    let repo_path = config::get_repo_path().ok_or("No repo configured")?;
    let full_path = safe_path(&repo_path, &filepath)?;
    if !full_path.is_file() {
        return Err("File not found".to_string());
    }
    fs::write(&full_path, &content).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "path": filepath, "saved": true }))
}

#[tauri::command]
pub fn create_file(filepath: String) -> Result<serde_json::Value, String> {
    let repo_path = config::get_repo_path().ok_or("No repo configured")?;
    let full_path = safe_path(&repo_path, &filepath)?;
    if full_path.exists() {
        return Err("File already exists".to_string());
    }
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&full_path, "").map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "path": filepath, "created": true }))
}

#[tauri::command]
pub fn browse_dir(path: Option<String>) -> Result<serde_json::Value, String> {
    let path_str = path.unwrap_or_else(|| "~".to_string());
    let expanded = expand_path(&path_str);
    let real_path = fs::canonicalize(&expanded).map_err(|e| e.to_string())?;

    if !real_path.is_dir() {
        return Err("Not a directory".to_string());
    }

    let mut items: Vec<BrowseItem> = Vec::new();
    let entries = fs::read_dir(&real_path).map_err(|e| e.to_string())?;
    let mut sorted: Vec<_> = entries.filter_map(|e| e.ok()).collect();
    sorted.sort_by(|a, b| {
        let a_dir = a.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        let b_dir = b.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        match (a_dir, b_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a
                .file_name()
                .to_string_lossy()
                .to_lowercase()
                .cmp(&b.file_name().to_string_lossy().to_lowercase()),
        }
    });

    for entry in sorted {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        if is_dir {
            items.push(BrowseItem {
                name,
                item_type: "directory".to_string(),
            });
        } else if name.to_lowercase().ends_with(".md") {
            items.push(BrowseItem {
                name,
                item_type: "file".to_string(),
            });
        }
    }

    let parent = real_path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    Ok(serde_json::json!({
        "path": real_path.to_string_lossy(),
        "parent": parent,
        "items": items,
    }))
}

#[tauri::command]
pub fn discover_repos(path: String) -> Result<serde_json::Value, String> {
    let expanded = expand_path(&path);
    let real_path = fs::canonicalize(&expanded).map_err(|e| e.to_string())?;

    if !real_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let mut repos: Vec<serde_json::Value> = Vec::new();
    discover_repos_recursive(&real_path, 0, 2, &mut repos);
    repos.sort_by(|a, b| {
        let a_name = a["name"].as_str().unwrap_or("").to_lowercase();
        let b_name = b["name"].as_str().unwrap_or("").to_lowercase();
        a_name.cmp(&b_name)
    });

    Ok(serde_json::json!({ "repos": repos }))
}

fn discover_repos_recursive(
    dir: &Path,
    depth: usize,
    max_depth: usize,
    repos: &mut Vec<serde_json::Value>,
) {
    if depth >= max_depth {
        return;
    }
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.filter_map(|e| e.ok()) {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let path = entry.path();
        if path.is_dir() {
            if path.join(".git").is_dir() {
                repos.push(serde_json::json!({
                    "path": path.to_string_lossy(),
                    "name": name,
                }));
            } else {
                discover_repos_recursive(&path, depth + 1, max_depth, repos);
            }
        }
    }
}

#[tauri::command]
pub fn detect_repo(path: String) -> Result<serde_json::Value, String> {
    let expanded = expand_path(&path);
    let mut current = if expanded.is_file() {
        expanded
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or(expanded)
    } else {
        expanded
    };

    loop {
        if current.join(".git").is_dir() {
            return Ok(
                serde_json::json!({ "repo_path": current.to_string_lossy() }),
            );
        }
        match current.parent() {
            Some(parent) if parent != current => current = parent.to_path_buf(),
            _ => break,
        }
    }

    Err("No git repository found".to_string())
}

#[tauri::command]
pub fn open_doc(path: String) -> Result<serde_json::Value, String> {
    let expanded = expand_path(&path);
    let real_path = fs::canonicalize(&expanded).map_err(|e| e.to_string())?;

    if !real_path.is_file() {
        return Err("File not found".to_string());
    }
    if !real_path
        .to_string_lossy()
        .to_lowercase()
        .ends_with(".md")
    {
        return Err("Not a markdown file".to_string());
    }

    // Detect repo by walking up
    let mut repo_path: Option<PathBuf> = None;
    let mut current = real_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| real_path.clone());
    loop {
        if current.join(".git").is_dir() {
            repo_path = Some(current.clone());
            break;
        }
        match current.parent() {
            Some(parent) if parent != current => current = parent.to_path_buf(),
            _ => break,
        }
    }

    let has_git = repo_path.is_some();
    let root = repo_path.unwrap_or_else(|| {
        real_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| real_path.clone())
    });

    let relative_path = real_path
        .strip_prefix(&root)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| real_path.to_string_lossy().to_string());

    // Save config
    let cfg = config::Config {
        repo_path: Some(root.to_string_lossy().to_string()),
        has_git,
    };
    config::save_config(&cfg)?;

    let content = fs::read_to_string(&real_path).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "repo_path": root.to_string_lossy(),
        "relative_path": relative_path,
        "has_git": has_git,
        "content": content,
    }))
}
