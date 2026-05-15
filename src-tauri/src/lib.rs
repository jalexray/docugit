mod config;
mod files;
mod git;

#[tauri::command]
fn get_config() -> Result<serde_json::Value, String> {
    let cfg = config::load_config();
    Ok(serde_json::json!({
        "repo_path": cfg.repo_path,
        "has_git": cfg.has_git,
    }))
}

#[tauri::command]
fn set_config(repo_path: String) -> Result<serde_json::Value, String> {
    let trimmed = repo_path.trim().to_string();
    if trimmed.is_empty() {
        return Err("repo_path is required".to_string());
    }

    // Expand ~ and resolve
    let expanded = if trimmed.starts_with('~') {
        if let Some(home) = dirs::home_dir() {
            home.join(&trimmed[1..].trim_start_matches('/'))
        } else {
            std::path::PathBuf::from(&trimmed)
        }
    } else {
        std::path::PathBuf::from(&trimmed)
    };

    let real_path = std::fs::canonicalize(&expanded).map_err(|_| "Directory does not exist")?;
    if !real_path.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let has_git = real_path.join(".git").is_dir();
    let path_str = real_path.to_string_lossy().to_string();

    let cfg = config::Config {
        repo_path: Some(path_str.clone()),
        has_git,
    };
    config::save_config(&cfg)?;

    Ok(serde_json::json!({
        "repo_path": path_str,
        "has_git": has_git,
        "valid": true,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            files::list_files,
            files::read_file,
            files::save_file,
            files::create_file,
            files::browse_dir,
            files::discover_repos,
            files::detect_repo,
            files::open_doc,
            git::git_status,
            git::git_branches,
            git::create_branch,
            git::checkout_branch,
            git::git_diff,
            git::stage_files,
            git::unstage_files,
            git::git_commit,
            git::git_push,
            git::git_unpushed,
            git::git_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
