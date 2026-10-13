#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{env, fs, path::{Path, PathBuf}, process::Command};

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
    for marker in ["Release-", "release-", "FORTNITE-RELEASE-", "FortniteRelease-"] {
        if let Some(idx) = s.find(marker) {
            let rest = &s[idx + marker.len()..];
            let mut out = String::new();
            for ch in rest.chars() {
                if ch.is_ascii_digit() || ch == '.' { out.push(ch); } else { break; }
            }
            if out.contains('.') { return Some(out); }
        }
    }
    for token in s.split(|c: char| !(c.is_ascii_alphanumeric() || c == '.' || c == '-')) {
        let t = token.trim().trim_start_matches('v').trim_start_matches('V');
        let mut parts = t.split('.');
        let a = parts.next().unwrap_or_default();
        let b = parts.next().unwrap_or_default();
        if !a.is_empty() && !b.is_empty() && a.chars().all(|c| c.is_ascii_digit()) && b.chars().all(|c| c.is_ascii_digit()) {
            return Some(format!("{}.{}", a, b));
        }
    }
    None
}

fn major(version: &str) -> Option<u32> { version.split('.').next()?.parse().ok() }

fn compatibility(version: Option<&str>) -> (String, bool) {
    let Some(v) = version else { return ("unknown: no Epic manifest, .egstore, Build.version, or EXE VersionInfo version found; cannot verify Project Reboot compatibility".into(), false); };
    let Some(m) = major(v) else { return ("unknown: parsed version is not numeric".into(), false); };
    if (3..=15).contains(&m) { return ("documented Project Reboot range S3-S15; still requires real runtime/client join evidence".into(), true); }
    if m <= 2 || (16..=19).contains(&m) { return ("experimental/imperfect Project Reboot range per README; not launch-verified".into(), false); }
    if m >= 20 { return ("S20+ / current Fortnite is documented unstable or unsupported for this Project Reboot path".into(), false); }
    ("unsupported by documented Project Reboot/Reboot Launcher range".into(), false)
}

fn standard_exe_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from(r"C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"),
        PathBuf::from(r"C:\Program Files (x86)\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"),
    ]
}

fn fortnite_root(exe: &Path) -> Option<PathBuf> { exe.ancestors().nth(4).map(|p| p.to_path_buf()) }

fn version_from_json_value(json: &Value) -> (Option<String>, Option<String>) {
    for key in ["BuildVersion", "AppVersion", "MainGameAppName", "DisplayName", "FullAppName", "AppName", "CatalogItemId"] {
        if let Some(v) = json.get(key).and_then(|v| v.as_str()).filter(|v| !v.trim().is_empty()) {
            if let Some(parsed) = extract_release_version(v) { return (Some(parsed), Some(v.to_string())); }
        }
    }
    (None, None)
}

fn read_epic_item_manifest_for(exe: &Path) -> (Option<String>, Option<String>, Option<String>) {
    let program_data = env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".into());
    let manifest_dir = Path::new(&program_data).join(r"Epic\EpicGamesLauncher\Data\Manifests");
    let Ok(entries) = fs::read_dir(&manifest_dir) else { return (None, None, None); };
    let exe_l = exe.to_string_lossy().to_lowercase();
    let root_l = fortnite_root(exe).map(|p| p.to_string_lossy().to_lowercase()).unwrap_or_default();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()).map(|x| !x.eq_ignore_ascii_case("item")).unwrap_or(true) { continue; }
        let Ok(text) = fs::read_to_string(&path) else { continue; };
        let Ok(json) = serde_json::from_str::<Value>(&text) else { continue; };
        let blob_l = text.to_lowercase();
        let install = json.get("InstallLocation").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        let app = json.get("AppName").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        let is_fortnite = app.contains("fortnite") || blob_l.contains("fortnite");
        let path_matches = (!install.is_empty() && (exe_l.starts_with(&install) || root_l.starts_with(&install))) || blob_l.contains("fortniteclient-win64-shipping.exe");
        if !is_fortnite || !path_matches { continue; }
        let (version, raw) = version_from_json_value(&json);
        if version.is_some() || raw.is_some() { return (version, raw, Some(path.to_string_lossy().to_string())); }
    }
    (None, None, None)
}

fn read_launcher_installed_for(exe: &Path) -> (Option<String>, Option<String>, Option<String>) {
    let program_data = env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".into());
    let candidates = [
        Path::new(&program_data).join(r"Epic\UnrealEngineLauncher\LauncherInstalled.dat"),
        Path::new(&program_data).join(r"Epic\EpicGamesLauncher\Data\LauncherInstalled.dat"),
    ];
    let root_l = fortnite_root(exe).map(|p| p.to_string_lossy().to_lowercase()).unwrap_or_default();
    for path in candidates {
        let Ok(text) = fs::read_to_string(&path) else { continue; };
        let Ok(json) = serde_json::from_str::<Value>(&text) else { continue; };
        let Some(arr) = json.get("InstallationList").and_then(|v| v.as_array()) else { continue; };
        for item in arr {
            let app = item.get("AppName").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let loc = item.get("InstallLocation").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            if !app.contains("fortnite") && !loc.contains("fortnite") { continue; }
            if !loc.is_empty() && !root_l.starts_with(&loc) { continue; }
            let (version, raw) = version_from_json_value(item);
            if version.is_some() || raw.is_some() { return (version, raw, Some(path.to_string_lossy().to_string())); }
        }
    }
    (None, None, None)
}

fn read_build_version_file(exe: &Path) -> (Option<String>, Option<String>, Option<String>) {
    let Some(root) = fortnite_root(exe) else { return (None, None, None); };
    let candidates = [
        root.join(r"FortniteGame\Build\Build.version"),
        root.join(r"Engine\Build\Build.version"),
    ];
    for path in candidates {
        let Ok(text) = fs::read_to_string(&path) else { continue; };
        if let Ok(json) = serde_json::from_str::<Value>(&text) {
            let raw = json.get("Changelist").and_then(|v| v.as_i64()).map(|v| v.to_string())
                .or_else(|| json.get("CompatibleChangelist").and_then(|v| v.as_i64()).map(|v| v.to_string()))
                .or_else(|| json.get("BranchName").and_then(|v| v.as_str()).map(|v| v.to_string()));
            let version = raw.as_deref().and_then(extract_release_version);
            if version.is_some() || raw.is_some() { return (version, raw, Some(path.to_string_lossy().to_string())); }
        } else if let Some(version) = extract_release_version(&text) {
            return (Some(version), Some(text.lines().next().unwrap_or_default().to_string()), Some(path.to_string_lossy().to_string()));
        }
    }
    (None, None, None)
}

fn read_egstore_metadata(exe: &Path) -> (Option<String>, Option<String>, Option<String>) {
    let Some(root) = fortnite_root(exe) else { return (None, None, None); };
    let dir = root.join(".egstore");
    let Ok(entries) = fs::read_dir(&dir) else { return (None, None, None); };
    for entry in entries.flatten() {
        let path = entry.path();
        let ext = path.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
        if !["json", "manifest", "item", "mancpn"].contains(&ext.as_str()) { continue; }
        let Ok(bytes) = fs::read(&path) else { continue; };
        let text = String::from_utf8_lossy(&bytes);
        if let Some(version) = extract_release_version(&text) {
            return (Some(version), Some(text.lines().next().unwrap_or_default().chars().take(120).collect()), Some(path.to_string_lossy().to_string()));
        }
    }
    (None, None, None)
}

#[cfg(target_os = "windows")]
fn read_windows_exe_version(exe: &Path) -> (Option<String>, Option<String>, Option<String>) {
    let script = "$p=$args[0]; $v=(Get-Item -LiteralPath $p).VersionInfo; @($v.ProductVersion,$v.FileVersion) -join \"`n\"";
    let Ok(out) = Command::new("powershell.exe").args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script, exe.to_string_lossy().as_ref()]).output() else { return (None, None, None); };
    let text = String::from_utf8_lossy(&out.stdout).to_string();
    for line in text.lines().filter(|l| !l.trim().is_empty()) {
        if let Some(version) = extract_release_version(line) { return (Some(version), Some(line.to_string()), Some("windows_exe_versioninfo".into())); }
    }
    (None, text.lines().find(|l| !l.trim().is_empty()).map(|l| l.to_string()), Some("windows_exe_versioninfo".into()))
}

#[cfg(not(target_os = "windows"))]
fn read_windows_exe_version(_exe: &Path) -> (Option<String>, Option<String>, Option<String>) { (None, None, None) }

fn first_metadata(exe: &Path) -> (Option<String>, Option<String>, Option<String>) {
    for finder in [read_epic_item_manifest_for, read_launcher_installed_for, read_egstore_metadata, read_build_version_file, read_windows_exe_version] {
        let found = finder(exe);
        if found.0.is_some() || found.1.is_some() || found.2.is_some() { return found; }
    }
    (None, None, None)
}

#[tauri::command]
fn detect_fortnite_install() -> Detection {
    for p in standard_exe_candidates() {
        if p.exists() {
            let (version, build_id, manifest_path) = first_metadata(&p);
            let (compatibility, supported) = compatibility(version.as_deref());
            return Detection {
                found: true,
                path: Some(p.to_string_lossy().to_string()),
                version,
                build_id,
                manifest_path,
                compatibility,
                supported_by_project_reboot: supported,
                message: "Local Fortnite executable detected read-only. Version was checked using Epic manifests/.egstore/Build.version/Windows VersionInfo when available. H0RII FN does not modify protected files or bypass Epic/anti-cheat controls.".into(),
                allowed_to_launch: false,
            };
        }
    }
    Detection { found: false, path: None, version: None, build_id: None, manifest_path: None, compatibility: "not_detected".into(), supported_by_project_reboot: false, message: "No standard local Fortnite install detected. Select-folder support is planned; no downloads are provided.".into(), allowed_to_launch: false }
}

#[tauri::command]
async fn api_get(url: String, token: Option<String>) -> Result<ApiResponse, String> {
    let client = reqwest::Client::builder().user_agent("H0RII-FN-Launcher/0.2.2").build().map_err(|e| e.to_string())?;
    let mut req = client.get(url);
    if let Some(token) = token.filter(|v| !v.is_empty()) { req = req.bearer_auth(token); }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16(); let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(ApiResponse { status, body })
}

#[tauri::command]
async fn api_post(input: ApiPostInput) -> Result<ApiResponse, String> {
    let client = reqwest::Client::builder().user_agent("H0RII-FN-Launcher/0.2.2").build().map_err(|e| e.to_string())?;
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
