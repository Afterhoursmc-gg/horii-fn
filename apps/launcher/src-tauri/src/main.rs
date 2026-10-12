#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct Detection {
    found: bool,
    path: Option<String>,
    version: Option<String>,
    message: String,
    allowed_to_launch: bool,
}

#[derive(Serialize)]
struct ApiResponse {
    status: u16,
    body: String,
}

#[derive(Deserialize)]
struct ApiPostInput {
    url: String,
    body: serde_json::Value,
    token: Option<String>,
}

#[tauri::command]
fn detect_fortnite_install() -> Detection {
    let candidates = [
        r"C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe",
        r"C:\Program Files (x86)\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe",
    ];

    for p in candidates {
        if std::path::Path::new(p).exists() {
            return Detection {
                found: true,
                path: Some(p.into()),
                version: None,
                message: "Local Fortnite executable detected. Client-only mode: H0RII FN will not modify protected files or bypass Epic/anti-cheat controls.".into(),
                allowed_to_launch: false,
            };
        }
    }

    Detection {
        found: false,
        path: None,
        version: None,
        message: "No standard local Fortnite install detected. Select-folder support is planned; no downloads are provided.".into(),
        allowed_to_launch: false,
    }
}

#[tauri::command]
async fn api_get(url: String, token: Option<String>) -> Result<ApiResponse, String> {
    let client = reqwest::Client::builder()
        .user_agent("H0RII-FN-Launcher/0.1.2")
        .build()
        .map_err(|e| e.to_string())?;
    let mut req = client.get(url);
    if let Some(token) = token.filter(|v| !v.is_empty()) {
        req = req.bearer_auth(token);
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { status, body })
}

#[tauri::command]
async fn api_post(input: ApiPostInput) -> Result<ApiResponse, String> {
    let client = reqwest::Client::builder()
        .user_agent("H0RII-FN-Launcher/0.1.2")
        .build()
        .map_err(|e| e.to_string())?;
    let mut req = client.post(input.url).json(&input.body);
    if let Some(token) = input.token.filter(|v| !v.is_empty()) {
        req = req.bearer_auth(token);
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { status, body })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![detect_fortnite_install, api_get, api_post])
        .run(tauri::generate_context!())
        .expect("error running H0RII FN launcher")
}
