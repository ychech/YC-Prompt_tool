// YC Prompt Tool v3 - Desktop Version
// Tauri + Rust Backend

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::fs;
use std::path::PathBuf;
use tauri::api::dialog;
use tauri::{command, generate_context, generate_handler, Builder, Manager, State};
use serde::{Deserialize, Serialize};

// Data structures
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Prompt {
    pub id: String,
    pub title: String,
    pub content: String,
    pub category: String,
    pub tags: Vec<String>,
    pub notes: String,
    pub version: String,
    pub is_featured: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PromptData {
    pub prompts: Vec<Prompt>,
    pub custom_categories: Vec<Category>,
    pub custom_tags: Vec<String>,
    pub featured_prompts: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub icon: String,
}

// App State
pub struct AppState {
    pub data_dir: PathBuf,
}

impl AppState {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        let data_dir = app_handle
            .path_resolver()
            .app_data_dir()
            .expect("Failed to get app data dir");
        
        // Create data directory if not exists
        fs::create_dir_all(&data_dir).expect("Failed to create data dir");
        
        Self { data_dir }
    }
    
    pub fn get_data_file_path(&self) -> PathBuf {
        self.data_dir.join("prompts_data.json")
    }
}

// Commands

/// Load prompts from file
#[command]
fn load_prompts(state: State<AppState>) -> Result<PromptData, String> {
    let file_path = state.get_data_file_path();
    
    if !file_path.exists() {
        // Return empty data
        return Ok(PromptData {
            prompts: vec![],
            custom_categories: vec![],
            custom_tags: vec![],
            featured_prompts: vec![],
        });
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let data: PromptData = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    Ok(data)
}

/// Save prompts to file
#[command]
fn save_prompts(data: PromptData, state: State<AppState>) -> Result<(), String> {
    let file_path = state.get_data_file_path();
    
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    
    fs::write(&file_path, json)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

/// Open file dialog
#[command]
async fn open_file_dialog(window: tauri::Window) -> Result<Option<String>, String> {
    let picked = dialog::FileDialogBuilder::new()
        .add_filter("JSON", &["json"])
        .pick_file();
    
    match picked {
        Some(path) => {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            Ok(Some(content))
        }
        None => Ok(None),
    }
}

/// Save file dialog
#[command]
async fn save_file_dialog(data: String, window: tauri::Window) -> Result<bool, String> {
    let picked = dialog::FileDialogBuilder::new()
        .add_filter("JSON", &["json"])
        .save_file();
    
    match picked {
        Some(path) => {
            fs::write(&path, data)
                .map_err(|e| format!("Failed to write file: {}", e))?;
            Ok(true)
        }
        None => Ok(false),
    }
}

/// Export to file
#[command]
fn export_to_file(data: String, path: String) -> Result<(), String> {
    fs::write(&path, data)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}

/// Get default data directory
#[command]
fn get_data_dir(state: State<AppState>) -> String {
    state.data_dir.to_string_lossy().to_string()
}

fn main() {
    Builder::default()
        .setup(|app| {
            // Initialize state
            let state = AppState::new(app.handle());
            app.manage(state);
            
            // Set up menu (macOS)
            #[cfg(target_os = "macos")]
            {
                use tauri::Menu;
                let menu = Menu::os_default(&app.package_info().name);
                app.set_menu(menu)?;
            }
            
            Ok(())
        })
        .invoke_handler(generate_handler![
            load_prompts,
            save_prompts,
            open_file_dialog,
            save_file_dialog,
            export_to_file,
            get_data_dir
        ])
        .run(generate_context!())
        .expect("error while running tauri application");
}
