use serde::Serialize;
use std::process::Command;

use crate::config;

fn run_git(repo_path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo_path)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn require_repo() -> Result<String, String> {
    let repo_path = config::get_repo_path().ok_or("No repo configured")?;
    // Verify it's a git repo
    let git_dir = std::path::Path::new(&repo_path).join(".git");
    if !git_dir.exists() {
        return Err("Not a git repository".to_string());
    }
    Ok(repo_path)
}

#[derive(Serialize)]
struct FileStatus {
    path: String,
    #[serde(rename = "type")]
    change_type: String,
}

#[tauri::command]
pub fn git_status() -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;
    let output = run_git(&repo_path, &["status", "--porcelain=v1", "--branch"])?;

    let mut branch = String::new();
    let mut staged: Vec<FileStatus> = Vec::new();
    let mut changed: Vec<FileStatus> = Vec::new();
    let mut untracked: Vec<String> = Vec::new();

    for line in output.lines() {
        if line.starts_with("## ") {
            // Parse branch name: "## main...origin/main" or "## main"
            let rest = &line[3..];
            branch = rest.split("...").next().unwrap_or(rest).to_string();
            if branch == "HEAD (no branch)" || branch.starts_with("No commits") {
                branch = "(detached)".to_string();
            }
            continue;
        }

        if line.len() < 4 {
            continue;
        }

        let x = line.as_bytes()[0] as char; // staged status
        let y = line.as_bytes()[1] as char; // unstaged status
        let file_path = line[3..].to_string();

        // Untracked
        if x == '?' && y == '?' {
            untracked.push(file_path);
            continue;
        }

        // Staged changes (index vs HEAD)
        if x != ' ' && x != '?' {
            let change_type = match x {
                'A' => "A",
                'M' => "M",
                'D' => "D",
                'R' => "R",
                'C' => "C",
                _ => "M",
            };
            staged.push(FileStatus {
                path: file_path.clone(),
                change_type: change_type.to_string(),
            });
        }

        // Unstaged changes (working tree vs index)
        if y != ' ' && y != '?' {
            let change_type = match y {
                'M' => "M",
                'D' => "D",
                _ => "M",
            };
            changed.push(FileStatus {
                path: file_path,
                change_type: change_type.to_string(),
            });
        }
    }

    Ok(serde_json::json!({
        "branch": branch,
        "staged": staged,
        "changed": changed,
        "untracked": untracked,
    }))
}

#[tauri::command]
pub fn git_branches() -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;

    // Get active branch
    let active = run_git(&repo_path, &["branch", "--show-current"])
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let output = run_git(
        &repo_path,
        &[
            "branch",
            "--format=%(refname:short)\t%(committerdate:iso-strict)\t%(subject)",
            "--sort=-committerdate",
        ],
    )?;

    let mut branches: Vec<serde_json::Value> = Vec::new();
    for line in output.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.splitn(3, '\t').collect();
        let name = parts.first().unwrap_or(&"").to_string();
        let date = parts.get(1).map(|s| s.to_string());
        let msg = parts
            .get(2)
            .map(|s| {
                let s = s.to_string();
                if s.len() > 80 {
                    s[..80].to_string()
                } else {
                    s
                }
            })
            .unwrap_or_default();

        branches.push(serde_json::json!({
            "name": name,
            "last_commit_date": date,
            "last_commit_msg": msg,
        }));
    }

    Ok(serde_json::json!({
        "branches": branches,
        "active": if active.is_empty() { serde_json::Value::Null } else { serde_json::Value::String(active) },
    }))
}

#[tauri::command]
pub fn create_branch(name: String) -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;
    run_git(&repo_path, &["checkout", "-b", &name])?;
    Ok(serde_json::json!({ "branch": name }))
}

#[tauri::command]
pub fn checkout_branch(name: String) -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;
    run_git(&repo_path, &["checkout", &name])?;
    Ok(serde_json::json!({ "branch": name }))
}

#[tauri::command]
pub fn git_diff(path: Option<String>) -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;
    let diff = match path {
        Some(ref p) if !p.is_empty() => run_git(&repo_path, &["diff", "--", p])?,
        _ => run_git(&repo_path, &["diff"])?,
    };
    Ok(serde_json::json!({ "diff": diff }))
}

#[tauri::command]
pub fn stage_files(paths: Vec<String>) -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;
    let mut args = vec!["add"];
    let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    args.extend(path_refs);
    run_git(&repo_path, &args)?;
    Ok(serde_json::json!({ "staged": paths }))
}

#[tauri::command]
pub fn unstage_files(paths: Vec<String>) -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;

    // Check if there are any commits
    let has_commits = run_git(&repo_path, &["rev-parse", "HEAD"]).is_ok();

    if has_commits {
        let mut args = vec!["reset", "HEAD"];
        let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
        args.extend(path_refs);
        run_git(&repo_path, &args)?;
    } else {
        let mut args = vec!["rm", "--cached"];
        let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
        args.extend(path_refs);
        run_git(&repo_path, &args)?;
    }

    Ok(serde_json::json!({ "unstaged": paths }))
}

#[tauri::command]
pub fn git_commit(message: String) -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;
    run_git(&repo_path, &["commit", "-m", &message])?;

    // Get the SHA of the commit we just made
    let sha = run_git(&repo_path, &["rev-parse", "HEAD"])?;

    Ok(serde_json::json!({
        "sha": sha.trim(),
        "message": message,
    }))
}

#[tauri::command]
pub fn git_push() -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;

    // Check if remotes exist
    let remotes = run_git(&repo_path, &["remote"])?;
    if remotes.trim().is_empty() {
        return Err("No remotes configured".to_string());
    }

    run_git(&repo_path, &["push"])?;
    Ok(serde_json::json!({ "pushed": true }))
}

#[tauri::command]
pub fn git_unpushed() -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;

    // Check if HEAD is valid
    if run_git(&repo_path, &["rev-parse", "HEAD"]).is_err() {
        return Ok(serde_json::json!({ "commits": [] }));
    }

    // Check if upstream exists
    let has_upstream = run_git(&repo_path, &["rev-parse", "--abbrev-ref", "@{u}"]).is_ok();

    let output = if has_upstream {
        run_git(
            &repo_path,
            &["log", "@{u}..HEAD", "--format=%h\t%s\t%an\t%aI"],
        )?
    } else {
        // No upstream — show all commits (up to 50)
        run_git(
            &repo_path,
            &["log", "-50", "--format=%h\t%s\t%an\t%aI"],
        )?
    };

    let commits = parse_log_output(&output);
    Ok(serde_json::json!({ "commits": commits }))
}

#[tauri::command]
pub fn git_log(limit: Option<u32>) -> Result<serde_json::Value, String> {
    let repo_path = require_repo()?;

    // Check if HEAD is valid
    if run_git(&repo_path, &["rev-parse", "HEAD"]).is_err() {
        return Ok(serde_json::json!({ "commits": [] }));
    }

    let limit_str = format!("-{}", limit.unwrap_or(20));
    let output = run_git(
        &repo_path,
        &["log", &limit_str, "--format=%h\t%s\t%an\t%aI"],
    )?;

    let commits = parse_log_output(&output);
    Ok(serde_json::json!({ "commits": commits }))
}

fn parse_log_output(output: &str) -> Vec<serde_json::Value> {
    output
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.splitn(4, '\t').collect();
            serde_json::json!({
                "sha": parts.first().unwrap_or(&""),
                "message": parts.get(1).unwrap_or(&""),
                "author": parts.get(2).unwrap_or(&""),
                "date": parts.get(3).unwrap_or(&""),
            })
        })
        .collect()
}
