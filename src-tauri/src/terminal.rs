use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

use crate::config;

/// Holds the PTY state — writer for sending input, master for resize, child for cleanup.
/// Wrapped in Mutex so multiple Tauri commands can access it safely from different threads.
pub struct PtyState {
    writer: Mutex<Option<Box<dyn Write + Send>>>,
    master: Mutex<Option<Box<dyn portable_pty::MasterPty + Send>>>,
    child: Mutex<Option<Box<dyn portable_pty::Child + Send + Sync>>>,
}

impl PtyState {
    pub fn new() -> Self {
        PtyState {
            writer: Mutex::new(None),
            master: Mutex::new(None),
            child: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub fn pty_spawn(app: AppHandle) -> Result<(), String> {
    let state = app.state::<PtyState>();

    // Kill any existing PTY first
    kill_pty(&state);

    // Determine shell and starting directory
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let cwd = config::get_repo_path().unwrap_or_else(|| {
        dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".to_string())
    });

    // Create the PTY pair (master + slave)
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Build the shell command
    let mut cmd = CommandBuilder::new(&shell);
    cmd.arg("-l"); // login shell — loads .zshrc/.zprofile for full PATH
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");

    // Spawn the shell process on the slave end
    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Drop the slave — the master holds the connection
    drop(pair.slave);

    // Get reader and writer from the master
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Store writer, master (for resize), and child handle
    *state.writer.lock().unwrap() = Some(writer);
    *state.master.lock().unwrap() = Some(pair.master);
    *state.child.lock().unwrap() = Some(child);

    // Spawn a background thread that reads PTY output and emits it to the frontend
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,   // EOF — child exited
                Ok(n) => {
                    // Convert to string (lossy — replaces invalid UTF-8)
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();
                    app.emit("pty-output", &text).ok();
                }
                Err(_) => break,
            }
        }
        app.emit("pty-exit", ()).ok();
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(app: AppHandle, data: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let mut writer_lock = state.writer.lock().unwrap();
    if let Some(ref mut writer) = *writer_lock {
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Write failed: {}", e))?;
        writer.flush().map_err(|e| format!("Flush failed: {}", e))?;
    } else {
        return Err("No PTY running".to_string());
    }
    Ok(())
}

#[tauri::command]
pub fn pty_resize(app: AppHandle, cols: u16, rows: u16) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let master_lock = state.master.lock().unwrap();
    if let Some(ref master) = *master_lock {
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize failed: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn pty_kill(app: AppHandle) -> Result<(), String> {
    let state = app.state::<PtyState>();
    kill_pty(&state);
    Ok(())
}

fn kill_pty(state: &PtyState) {
    // Drop writer first to close the write end
    *state.writer.lock().unwrap() = None;
    // Kill child process
    if let Some(mut child) = state.child.lock().unwrap().take() {
        child.kill().ok();
        child.wait().ok();
    }
    // Drop master to fully close the PTY
    *state.master.lock().unwrap() = None;
}
