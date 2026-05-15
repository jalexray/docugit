use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
pub struct Config {
    pub repo_path: Option<String>,
    #[serde(default)]
    pub has_git: bool,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            repo_path: None,
            has_git: false,
        }
    }
}

fn config_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.docugit.app");
    fs::create_dir_all(&config_dir).ok();
    config_dir.join("config.json")
}

pub fn load_config() -> Config {
    let path = config_path();
    match fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => Config::default(),
    }
}

pub fn save_config(config: &Config) -> Result<(), String> {
    let path = config_path();
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())
}

pub fn get_repo_path() -> Option<String> {
    let config = load_config();
    match config.repo_path {
        Some(ref p) if std::path::Path::new(p).is_dir() => Some(p.clone()),
        _ => None,
    }
}
