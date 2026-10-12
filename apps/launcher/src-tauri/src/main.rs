#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::Serialize;
#[derive(Serialize)]struct Detection{found:bool,path:Option<String>,version:Option<String>,message:String,allowed_to_launch:bool}
#[tauri::command]
fn detect_fortnite_install()->Detection{let candidates=[r"C:\Program Files\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe",r"C:\Program Files (x86)\Epic Games\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe"];
 for p in candidates{if std::path::Path::new(p).exists(){return Detection{found:true,path:Some(p.into()),version:None,message:"Local Fortnite executable detected. H0RII FN will not modify protected files or bypass Epic/anti-cheat controls.".into(),allowed_to_launch:false}}}
 Detection{found:false,path:None,version:None,message:"No standard local Fortnite install detected. Select-folder support is planned; no downloads are provided.".into(),allowed_to_launch:false}}
fn main(){tauri::Builder::default().invoke_handler(tauri::generate_handler![detect_fortnite_install]).run(tauri::generate_context!()).expect("error running H0RII FN launcher")}
