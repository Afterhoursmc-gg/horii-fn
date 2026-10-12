#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{env, fs, path::{Path, PathBuf}};

#[derive(Serialize)]
struct Detection {
    found: bool,
    path: Option<String>,
    version: Option<String>,
    build_id: Option<String>,
    manifest_path: Option<String>,
    compatibility: String,
    supported_by_project_reboot: bool,
    message: String,
    allowed_to_launch: bool,
}

#[derive(Serialize)]
struct ApiResponse { status: u16, body: String }

#[derive(Deserialize)]
struct ApiPostInput { url: String, body: serde_json::Value, token: Option<String> }

fn extract_release_version(s: &str) -> Option<String> {
    for marker in ["Release-", "release-", "FORTNITE-RELEASE-"] {
        if let Some(idx) = s.find(marker) {
            let rest = &s[idx + marker.len()..];
            let mut out = String::new();
            for ch in rest.chars() {
                if ch.is_ascii_digit() || ch == '.' { out.push(ch); } else { break; }
            }
            if !out.is_empty() { return Some(out); }
        }
    }
    let trimmed = s.trim().trim_start_matches("Fortnite ");
    let mut out = String::new();
    for ch in trimmed.chars() {
        if ch.is_ascii_digit() || ch == '.' { out.push(ch); } else if !out.is_empty() { break; }
    }
    if out.contains('.') { Some(out) } else { None }
}

fn major(version: &str) -> Option<u32> { version.split('.').next()?.parse().ok() }

fn compatibility(version: Option<&str>) -> (String, bool) {
    let Some(v) = version else { return ("unknown: Epic manifest/version not found yet; cannot verify Project Reboot compatibility".into(), false); };
    let Some(m) = major(v) else { return ("unknown: parsed version is not numeric".into(), false); };
    if (3..=15).contains(&m) { return ("documented Project Reboot range S3-S15; still requires real runtime/client join evidence".into(), true); }
    if m <= 2 || (16..=19).contains(&m) { return ("experimental/imperfect Project Reboot range per README; not launch-verified".into(), false); }
    if m == 20 { return ("S20+ is documented unstable; not verified for H0RII FN".into(), false); }
    ("unsupported by documented Project Reboot/Reboot Launcher range; current Fortnite builds are not verified".into(), false)
}

fn standard_exe_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from(r"C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"),
        PathBuf::from(r"C:\Program Files (x86)\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"),
    ]
}

fn read_epic_manifest_for(exe: &Path) -> (Option<String>, Option<String>, Option<String>) {
    let program_data = env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".into());
    let manifest_dir = Path::new(&program_data).join(r"Epic\EpicGamesLauncher\Data\Manifests");
    let Ok(entries) = fs::read_dir(&manifest_dir) else { return (None, None, None); };
    let exe_l = exe.to_string_lossy().to_lowercase();
    let fortnite_root = exe.ancestors().nth(4).map(|p| p.to_string_lossy().to_lowercase()).unwrap_or_default();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()).map(|x| !x.eq_ignore_ascii_case("item")).unwrap_or(true) { continue; }
        let Ok(text) = fs::read_to_string(&path) else { continue; };
        let Ok(json) = serde_json::from_str::<Value>(&text) else { continue; };
        let blob_l = text.to_lowercase();
        let install = json.get("InstallLocation").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        let app = json.get("AppName").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        let is_fortnite = app.contains("fortnite") || blob_l.contains("fortnite");
        let path_matches = (!install.is_empty() && (exe_l.starts_with(&install) || fortnite_root.starts_with(&install))) || blob_l.contains("fortniteclient-win64-shipping.exe");
        if !is_fortnite || !path_matches { continue; }
        let mut raw = None;
        for key in ["BuildVersion", "AppVersion", "MainGameAppName", "DisplayName", "FullAppName"] {
            if let Some(v) = json.get(key).and_then(|v| v.as_str()) { if !v.trim().is_empty() { raw = Some(v.to_string()); break; } }
        }
        let parsed = raw.as_deref().and_then(extract_release_version).or_else(|| raw.clone());
        return (parsed, raw, Some(path.to_string_lossy().to_string()));
    }
    (None, None, None)
}

#[tauri::command]
fn detect_fortnite_install() -> Detection {
    for p in standard_exe_candidates() {
        if p.exists() {
            let (version, build_id, manifest_path) = read_epic_manifest_for(&p);
            let (compatibility, supported) = compatibility(version.as_deref());
            return Detection {
                found: true,
                path: Some(p.to_string_lossy().to_string()),
                version,
                build_id,
                manifest_path,
                compatibility,
                supported_by_project_reboot: supported,
                message: "Local Fortnite executable detected read-only. H0RII FN does not modify protected files or bypass Epic/anti-cheat controls.".into(),
                allowed_to_launch: false,
            };
        }
    }
    Detection { found: false, path: None, version: None, build_id: None, manifest_path: None, compatibility: "not_detected".into(), supported_by_project_reboot: false, message: "No standard local Fortnite install detected. Select-folder support is planned; no downloads are provided.".into(), allowed_to_launch: false }
}

#[tauri::command]
async fn api_get(url: String, token: Option<String>) -> Result<ApiResponse, String> {
    let client = reqwest::Client::builder().user_agent("H0RII-FN-Launcher/0.1.3").build().map_err(|e| e.to_string())?;
    let mut req = client.get(url);
    if let Some(token) = token.filter(|v| !v.is_empty()) { req = req.bearer_auth(token); }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16(); let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { status, body })
}

#[tauri::command]
async fn api_post(input: ApiPostInput) -> Result<ApiResponse, String> {
    let client = reqwest::Client::builder().user_agent("H0RII-FN-Launcher/0.1.3").build().map_err(|e| e.to_string())?;
    let mut req = client.post(input.url).json(&input.body);
    if let Some(token) = input.token.filter(|v| !v.is_empty()) { req = req.bearer_auth(token); }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16(); let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { status, body })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![detect_fortnite_install, api_get, api_post])
        .run(tauri::generate_context!())
        .expect("error running H0RII FN launcher")
}
