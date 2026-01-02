#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{State, Manager, Emitter};
use tauri::tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent};
use tauri::menu::{Menu, MenuItem};
use warp::Filter;
use std::convert::Infallible;
use std::time::{SystemTime, UNIX_EPOCH};
use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

const INNERTUBE_API_KEY: &str = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const DISCORD_CLIENT_ID: &str = "1456592368005283893"; // You'll need to create a Discord app and get this ID

struct AppState {
    client: Client,
    visitor_data: Mutex<Option<String>>,
    stream_urls: Arc<Mutex<HashMap<String, String>>>,
    audio_cache: Arc<Mutex<HashMap<String, Vec<u8>>>>,
}

// Global media controls - must be kept alive for the duration of the app
static MEDIA_CONTROLS: std::sync::OnceLock<Arc<Mutex<MediaControls>>> = std::sync::OnceLock::new();

// Global Discord RPC client
static DISCORD_CLIENT: std::sync::OnceLock<Arc<Mutex<Option<DiscordIpcClient>>>> = std::sync::OnceLock::new();

fn init_discord_rpc() -> Option<DiscordIpcClient> {
    match DiscordIpcClient::new(DISCORD_CLIENT_ID) {
        Ok(mut client) => {
            match client.connect() {
                Ok(_) => Some(client),
                Err(_) => None
            }
        }
        Err(_) => None
    }
}

fn init_media_controls(app_handle: tauri::AppHandle) -> Option<Arc<Mutex<MediaControls>>> {
    #[cfg(not(target_os = "windows"))]
    {
        let config = PlatformConfig {
            dbus_name: "vyra",
            display_name: "VYRA",
            hwnd: None,
        };
        
        match MediaControls::new(config) {
            Ok(mut controls) => {
                let handle = app_handle.clone();
                let _ = controls.attach(move |event: MediaControlEvent| {
                    handle_media_event(&handle, event);
                });
                Some(Arc::new(Mutex::new(controls)))
            }
            Err(_) => None
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
        use windows::Win32::UI::WindowsAndMessaging::{
            CreateWindowExW, RegisterClassW, CS_HREDRAW, CS_VREDRAW,
            WNDCLASSW, WS_OVERLAPPEDWINDOW, CW_USEDEFAULT, WINDOW_EX_STYLE,
        };
        use windows::core::{PCWSTR, w};
        
        // Custom window procedure
        unsafe extern "system" fn wnd_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
            windows::Win32::UI::WindowsAndMessaging::DefWindowProcW(hwnd, msg, wparam, lparam)
        }
        
        unsafe {
            // Create a hidden window class for SMTC
            let class_name = w!("VYRAMediaClass");
            
            let wc = WNDCLASSW {
                style: CS_HREDRAW | CS_VREDRAW,
                lpfnWndProc: Some(wnd_proc),
                hInstance: windows::Win32::System::LibraryLoader::GetModuleHandleW(PCWSTR::null()).unwrap_or_default().into(),
                lpszClassName: class_name,
                ..Default::default()
            };
            
            RegisterClassW(&wc);
            
            // Create hidden window
            let hwnd = CreateWindowExW(
                WINDOW_EX_STYLE::default(),
                class_name,
                w!("VYRA Media"),
                WS_OVERLAPPEDWINDOW,
                CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
                HWND::default(),
                None,
                wc.hInstance,
                None,
            );
            
            if hwnd.is_err() {
                return None;
            }
            
            let hwnd = hwnd.unwrap();
            
            let config = PlatformConfig {
                dbus_name: "vyra",
                display_name: "VYRA",
                hwnd: Some(hwnd.0 as *mut std::ffi::c_void),
            };
            
            match MediaControls::new(config) {
                Ok(mut controls) => {
                    let handle = app_handle.clone();
                    let _ = controls.attach(move |event: MediaControlEvent| {
                        handle_media_event(&handle, event);
                    });
                    Some(Arc::new(Mutex::new(controls)))
                }
                Err(_) => None
            }
        }
    }
}

fn handle_media_event(app_handle: &tauri::AppHandle, event: MediaControlEvent) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let payload = match event {
            MediaControlEvent::Play => "play",
            MediaControlEvent::Pause => "pause",
            MediaControlEvent::Toggle => "play_pause",
            MediaControlEvent::Next => "next",
            MediaControlEvent::Previous => "prev",
            MediaControlEvent::Stop => "stop",
            _ => return,
        };
        let _ = window.emit("media-control", payload);
    }
}

fn create_context(visitor_data: Option<&str>, client_name: &str, client_version: &str) -> Value {
    json!({
        "client": {
            "clientName": client_name,
            "clientVersion": client_version,
            "hl": "en",
            "gl": "US",
            "visitorData": visitor_data
        }
    })
}

#[tauri::command]
async fn yt_browse(
    state: State<'_, AppState>,
    browse_id: String,
    params: Option<String>,
) -> Result<Value, String> {
    let visitor_data = state.visitor_data.lock().unwrap().clone();
    let context = create_context(visitor_data.as_deref(), "WEB_REMIX", "1.20231204.01.00");

    let mut body = json!({
        "context": context,
        "browseId": browse_id
    });

    if let Some(p) = params {
        body["params"] = json!(p);
    }

    let response = state
        .client
        .post(format!(
            "https://music.youtube.com/youtubei/v1/browse?key={}",
            INNERTUBE_API_KEY
        ))
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: Value = response.json().await.map_err(|e| e.to_string())?;

    if let Some(vd) = data["responseContext"]["visitorData"].as_str() {
        *state.visitor_data.lock().unwrap() = Some(vd.to_string());
    }

    Ok(data)
}

#[tauri::command]
async fn yt_search(
    state: State<'_, AppState>,
    query: String,
    params: Option<String>,
) -> Result<Value, String> {
    let visitor_data = state.visitor_data.lock().unwrap().clone();
    let context = create_context(visitor_data.as_deref(), "WEB_REMIX", "1.20231204.01.00");

    let mut body = json!({
        "context": context,
        "query": query
    });

    if let Some(p) = params {
        body["params"] = json!(p);
    }

    let response = state
        .client
        .post(format!(
            "https://music.youtube.com/youtubei/v1/search?key={}",
            INNERTUBE_API_KEY
        ))
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.json().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn yt_suggestions(
    state: State<'_, AppState>,
    input: String,
) -> Result<Value, String> {
    let visitor_data = state.visitor_data.lock().unwrap().clone();
    let context = create_context(visitor_data.as_deref(), "WEB_REMIX", "1.20231204.01.00");

    let body = json!({
        "context": context,
        "input": input
    });

    let response = state
        .client
        .post(format!(
            "https://music.youtube.com/youtubei/v1/music/get_search_suggestions?key={}",
            INNERTUBE_API_KEY
        ))
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.json().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn yt_next(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<Value, String> {
    let visitor_data = state.visitor_data.lock().unwrap().clone();
    let context = create_context(visitor_data.as_deref(), "WEB_REMIX", "1.20231204.01.00");

    // Request the radio playlist (RDAMVM prefix) to get related songs
    let playlist_id = format!("RDAMVM{}", video_id);
    
    let body = json!({
        "context": context,
        "videoId": video_id,
        "playlistId": playlist_id,
        "isAudioOnly": true,
        "enablePersistentPlaylistPanel": true,
        "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
        "watchEndpointMusicSupportedConfigs": {
            "watchEndpointMusicConfig": {
                "hasPersistentPlaylistPanel": true,
                "musicVideoType": "MUSIC_VIDEO_TYPE_ATV"
            }
        },
        "params": "wAEB"
    });

    let response = state
        .client
        .post(format!(
            "https://music.youtube.com/youtubei/v1/next?key={}",
            INNERTUBE_API_KEY
        ))
        .header("Content-Type", "application/json")
        .header("Origin", "https://music.youtube.com")
        .header("Referer", "https://music.youtube.com/")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.json().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn yt_stream(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<Option<String>, String> {
    // Get current timestamp for signature
    let sig_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() / 86400; // Days since epoch

    let clients = vec![
        // Android Music - best for audio
        ("ANDROID_MUSIC", "6.42.52", "21", "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 11) gzip"),
        // Android VR - good fallback
        ("ANDROID_VR", "1.43.32", "28", "com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip"),
        // iOS - another fallback
        ("IOS", "19.45.4", "5", "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)"),
        // TV Embedded - works for many restricted videos
        ("TVHTML5_SIMPLY_EMBEDDED_PLAYER", "2.0", "85", "Mozilla/5.0 (PlayStation; PlayStation 4/11.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15"),
    ];

    for (client_name, client_version, client_id, user_agent) in clients {
        let visitor_data = state.visitor_data.lock().unwrap().clone();
        
        let body = json!({
            "context": {
                "client": {
                    "clientName": client_name,
                    "clientVersion": client_version,
                    "hl": "en",
                    "gl": "US",
                    "visitorData": visitor_data,
                    "androidSdkVersion": 30
                }
            },
            "videoId": video_id,
            "playbackContext": {
                "contentPlaybackContext": {
                    "signatureTimestamp": sig_timestamp
                }
            },
            "racyCheckOk": true,
            "contentCheckOk": true
        });

        let response = state
            .client
            .post(format!(
                "https://music.youtube.com/youtubei/v1/player?key={}",
                INNERTUBE_API_KEY
            ))
            .header("Content-Type", "application/json")
            .header("Origin", "https://music.youtube.com")
            .header("Referer", "https://music.youtube.com/")
            .header("User-Agent", user_agent)
            .header("X-Goog-Api-Format-Version", "1")
            .header("X-YouTube-Client-Name", client_id)
            .header("X-YouTube-Client-Version", client_version)
            .json(&body)
            .send()
            .await;

        if let Ok(resp) = response {
            if let Ok(data) = resp.json::<Value>().await {
                let status = data["playabilityStatus"]["status"].as_str().unwrap_or("");
                
                // Log for debugging
                if status != "OK" {
                    continue;
                }

                // Try adaptiveFormats first (higher quality)
                if let Some(formats) = data["streamingData"]["adaptiveFormats"].as_array() {
                    if let Some(url) = find_best_audio_url(formats) {
                        state.stream_urls.lock().unwrap().insert(video_id.clone(), url);
                        return Ok(Some(format!("http://127.0.0.1:9876/audio/{}", video_id)));
                    }
                }

                // Fallback to regular formats
                if let Some(formats) = data["streamingData"]["formats"].as_array() {
                    if let Some(url) = find_best_audio_url(formats) {
                        state.stream_urls.lock().unwrap().insert(video_id.clone(), url);
                        return Ok(Some(format!("http://127.0.0.1:9876/audio/{}", video_id)));
                    }
                }
            }
        }
    }

    // Fallback to Piped API
    let piped_instances = vec![
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.adminforge.de",
        "https://api.piped.yt",
    ];

    for instance in piped_instances {
        let response = state
            .client
            .get(format!("{}/streams/{}", instance, video_id))
            .header("User-Agent", "Mozilla/5.0")
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await;

        if let Ok(resp) = response {
            if resp.status().is_success() {
                if let Ok(data) = resp.json::<Value>().await {
                    if let Some(streams) = data["audioStreams"].as_array() {
                        let mut audio_streams: Vec<&Value> = streams
                            .iter()
                            .filter(|s| {
                                s["mimeType"]
                                    .as_str()
                                    .map(|m| m.contains("audio"))
                                    .unwrap_or(false)
                            })
                            .collect();

                        audio_streams.sort_by(|a, b| {
                            let bitrate_a = a["bitrate"].as_i64().unwrap_or(0);
                            let bitrate_b = b["bitrate"].as_i64().unwrap_or(0);
                            bitrate_b.cmp(&bitrate_a)
                        });

                        if let Some(stream) = audio_streams.first() {
                            if let Some(url) = stream["url"].as_str() {
                                state.stream_urls.lock().unwrap().insert(video_id.clone(), url.to_string());
                                return Ok(Some(format!("http://127.0.0.1:9876/audio/{}", video_id)));
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(None)
}

fn find_best_audio_url(formats: &[Value]) -> Option<String> {
    let mut audio_formats: Vec<&Value> = formats
        .iter()
        .filter(|f| {
            f["mimeType"]
                .as_str()
                .map(|m| m.starts_with("audio/"))
                .unwrap_or(false)
        })
        .collect();

    // Sort by bitrate (highest first)
    audio_formats.sort_by(|a, b| {
        let bitrate_a = a["bitrate"].as_i64().unwrap_or(0);
        let bitrate_b = b["bitrate"].as_i64().unwrap_or(0);
        bitrate_b.cmp(&bitrate_a)
    });

    // Return first format with a URL
    for format in audio_formats {
        if let Some(url) = format["url"].as_str() {
            return Some(url.to_string());
        }
    }
    None
}

// Find audio URL by quality preference
fn find_audio_url_by_quality(formats: &[Value], quality: &str) -> Option<String> {
    let mut audio_formats: Vec<&Value> = formats
        .iter()
        .filter(|f| {
            f["mimeType"]
                .as_str()
                .map(|m| m.starts_with("audio/"))
                .unwrap_or(false)
        })
        .collect();

    // Sort by bitrate
    audio_formats.sort_by(|a, b| {
        let bitrate_a = a["bitrate"].as_i64().unwrap_or(0);
        let bitrate_b = b["bitrate"].as_i64().unwrap_or(0);
        bitrate_b.cmp(&bitrate_a)
    });

    if audio_formats.is_empty() {
        return None;
    }

    // Select based on quality
    let idx = match quality {
        "very_high" => 0, // Highest bitrate
        "high" => audio_formats.len() / 3, // Upper third
        _ => audio_formats.len() / 2, // Middle (normal)
    };

    let selected = audio_formats.get(idx.min(audio_formats.len() - 1))?;
    selected["url"].as_str().map(|s| s.to_string())
}

#[tauri::command]
async fn download_track(
    state: State<'_, AppState>,
    video_id: String,
    title: String,
    artist: String,
    download_path: Option<String>,
    quality: String,
) -> Result<String, String> {
    use std::io::Write;
    
    // Get stream URL - first check cache
    let stream_url = {
        let urls = state.stream_urls.lock().unwrap();
        urls.get(&video_id).cloned()
    };

    let url = if let Some(url) = stream_url {
        url
    } else {
        // Try multiple clients like yt_stream does
        let sig_timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() / 86400;

        let clients = vec![
            ("ANDROID_MUSIC", "6.42.52", "21", "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 11) gzip"),
            ("ANDROID_VR", "1.43.32", "28", "com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip"),
            ("IOS", "19.45.4", "5", "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)"),
            ("TVHTML5_SIMPLY_EMBEDDED_PLAYER", "2.0", "85", "Mozilla/5.0 (PlayStation; PlayStation 4/11.00) AppleWebKit/605.1.15"),
        ];

        let mut found_url: Option<String> = None;

        for (client_name, client_version, client_id, user_agent) in &clients {
            let visitor_data = state.visitor_data.lock().unwrap().clone();
            
            let body = json!({
                "context": {
                    "client": {
                        "clientName": client_name,
                        "clientVersion": client_version,
                        "hl": "en",
                        "gl": "US",
                        "visitorData": visitor_data,
                        "androidSdkVersion": 30
                    }
                },
                "videoId": video_id,
                "playbackContext": {
                    "contentPlaybackContext": {
                        "signatureTimestamp": sig_timestamp
                    }
                },
                "racyCheckOk": true,
                "contentCheckOk": true
            });

            let response = state
                .client
                .post(format!(
                    "https://music.youtube.com/youtubei/v1/player?key={}",
                    INNERTUBE_API_KEY
                ))
                .header("Content-Type", "application/json")
                .header("Origin", "https://music.youtube.com")
                .header("Referer", "https://music.youtube.com/")
                .header("User-Agent", *user_agent)
                .header("X-Goog-Api-Format-Version", "1")
                .header("X-YouTube-Client-Name", *client_id)
                .header("X-YouTube-Client-Version", *client_version)
                .json(&body)
                .send()
                .await;

            if let Ok(resp) = response {
                if let Ok(data) = resp.json::<Value>().await {
                    let status = data["playabilityStatus"]["status"].as_str().unwrap_or("");
                    
                    if status != "OK" {
                        continue;
                    }

                    // Try adaptiveFormats first
                    if let Some(formats) = data["streamingData"]["adaptiveFormats"].as_array() {
                        if let Some(url) = find_audio_url_by_quality(formats, &quality) {
                            found_url = Some(url);
                            break;
                        }
                    }

                    // Fallback to regular formats
                    if let Some(formats) = data["streamingData"]["formats"].as_array() {
                        if let Some(url) = find_audio_url_by_quality(formats, &quality) {
                            found_url = Some(url);
                            break;
                        }
                    }
                }
            }
        }

        // Fallback to Piped API if InnerTube fails
        if found_url.is_none() {
            let piped_instances = vec![
                "https://pipedapi.kavin.rocks",
                "https://pipedapi.adminforge.de",
                "https://api.piped.yt",
            ];

            for instance in piped_instances {
                let response = state
                    .client
                    .get(format!("{}/streams/{}", instance, video_id))
                    .header("User-Agent", "Mozilla/5.0")
                    .timeout(std::time::Duration::from_secs(10))
                    .send()
                    .await;

                if let Ok(resp) = response {
                    if resp.status().is_success() {
                        if let Ok(data) = resp.json::<Value>().await {
                            if let Some(streams) = data["audioStreams"].as_array() {
                                let mut audio_streams: Vec<&Value> = streams
                                    .iter()
                                    .filter(|s| {
                                        s["mimeType"]
                                            .as_str()
                                            .map(|m| m.contains("audio"))
                                            .unwrap_or(false)
                                    })
                                    .collect();

                                audio_streams.sort_by(|a, b| {
                                    let bitrate_a = a["bitrate"].as_i64().unwrap_or(0);
                                    let bitrate_b = b["bitrate"].as_i64().unwrap_or(0);
                                    bitrate_b.cmp(&bitrate_a)
                                });

                                // Select based on quality
                                if !audio_streams.is_empty() {
                                    let idx = match quality.as_str() {
                                        "very_high" => 0,
                                        "high" => audio_streams.len() / 3,
                                        _ => audio_streams.len() / 2,
                                    };
                                    let selected = audio_streams.get(idx.min(audio_streams.len() - 1));
                                    if let Some(stream) = selected {
                                        if let Some(url) = stream["url"].as_str() {
                                            found_url = Some(url.to_string());
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        found_url.ok_or_else(|| "Could not find audio stream for this track".to_string())?
    };

    // Download the audio
    let response = state
        .client
        .get(&url)
        .header("User-Agent", "com.google.android.apps.youtube.music/6.42.52")
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    let bytes = response.bytes().await.map_err(|e| format!("Failed to read response: {}", e))?;

    // Determine download path
    let base_path = if let Some(path) = download_path {
        if path.is_empty() {
            dirs::audio_dir().unwrap_or_else(|| dirs::download_dir().unwrap_or_else(|| std::path::PathBuf::from(".")))
        } else {
            std::path::PathBuf::from(path)
        }
    } else {
        dirs::audio_dir().unwrap_or_else(|| dirs::download_dir().unwrap_or_else(|| std::path::PathBuf::from(".")))
    };

    // Create VYRA subfolder
    let download_dir = base_path.join("VYRA");
    std::fs::create_dir_all(&download_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    // Sanitize filename
    let safe_title: String = title.chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let safe_artist: String = artist.chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    
    let filename = format!("{} - {}.webm", safe_artist, safe_title);
    let file_path = download_dir.join(&filename);

    // Write file
    let mut file = std::fs::File::create(&file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::mpsc;
    
    let (tx, rx) = mpsc::channel();
    
    app.dialog()
        .file()
        .set_title("Select Download Location")
        .pick_folder(move |path| {
            let result = path.map(|p| p.to_string());
            let _ = tx.send(result);
        });
    
    // Wait for the result
    match rx.recv() {
        Ok(path) => Ok(path),
        Err(_) => Ok(None)
    }
}

// Cache audio for offline playback
#[tauri::command]
async fn cache_audio(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<bool, String> {
    // Check if already cached
    {
        let cache = state.audio_cache.lock().unwrap();
        if cache.contains_key(&video_id) {
            return Ok(true);
        }
    }

    // Get stream URL
    let url = {
        let urls = state.stream_urls.lock().unwrap();
        urls.get(&video_id).cloned()
    };

    let url = match url {
        Some(u) => u,
        None => return Err("No stream URL available. Play the song first.".to_string()),
    };

    // Download and cache the audio
    let response = state
        .client
        .get(&url)
        .header("User-Agent", "com.google.android.apps.youtube.music/6.42.52")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch audio: {}", e))?;

    let bytes = response.bytes().await.map_err(|e| format!("Failed to read audio: {}", e))?;
    
    // Store in cache
    {
        let mut cache = state.audio_cache.lock().unwrap();
        cache.insert(video_id.clone(), bytes.to_vec());
    }

    Ok(true)
}

#[tauri::command]
async fn get_cached_audio(
    state: State<'_, AppState>,
    video_id: String,
) -> Result<bool, String> {
    let cache = state.audio_cache.lock().unwrap();
    Ok(cache.contains_key(&video_id))
}

#[tauri::command]
async fn clear_audio_cache(
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut cache = state.audio_cache.lock().unwrap();
    cache.clear();
    Ok(())
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_media_metadata(
    title: String,
    artist: String,
    album: Option<String>,
    cover_url: Option<String>,
) -> Result<(), String> {
    if let Some(controls_arc) = MEDIA_CONTROLS.get() {
        if let Ok(mut controls) = controls_arc.lock() {
            // First set playback to playing to activate SMTC
            let _ = controls.set_playback(MediaPlayback::Playing { progress: None });
            
            // Then set metadata
            controls.set_metadata(MediaMetadata {
                title: Some(&title),
                artist: Some(&artist),
                album: album.as_deref(),
                cover_url: cover_url.as_deref(),
                duration: None,
            }).map_err(|e| format!("{:?}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn update_media_playback(is_playing: bool) -> Result<(), String> {
    if let Some(controls_arc) = MEDIA_CONTROLS.get() {
        if let Ok(mut controls) = controls_arc.lock() {
            let playback = if is_playing {
                MediaPlayback::Playing { progress: None }
            } else {
                MediaPlayback::Paused { progress: None }
            };
            controls.set_playback(playback).map_err(|e| format!("{:?}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn update_discord_presence(
    title: String,
    artist: String,
    _album: Option<String>,
    duration_secs: Option<i64>,
    elapsed_secs: Option<i64>,
    is_playing: bool,
    thumbnail: Option<String>,
) -> Result<(), String> {
    if let Some(client_arc) = DISCORD_CLIENT.get() {
        if let Ok(mut client_opt) = client_arc.lock() {
            // Try to reconnect if not connected
            if client_opt.is_none() {
                *client_opt = init_discord_rpc();
            }
            
            if let Some(client) = client_opt.as_mut() {
                // Calculate timestamps for progress bar
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64;
                
                // Build activity - Spotify-like format
                // Details = Song title (with Paused if paused)
                // State = Artist name
                let details_text = if is_playing {
                    title.clone()
                } else {
                    format!("{} (Paused)", title)
                };
                
                let mut act = activity::Activity::new()
                    .activity_type(activity::ActivityType::Listening)
                    .details(&details_text)
                    .state(&artist);
                
                // Always add timestamps for progress bar
                let start_time = if let Some(elapsed) = elapsed_secs {
                    now - elapsed
                } else {
                    now
                };
                
                let timestamps = if let (Some(dur), Some(_)) = (duration_secs, elapsed_secs) {
                    activity::Timestamps::new()
                        .start(start_time)
                        .end(start_time + dur)
                } else {
                    activity::Timestamps::new()
                        .start(start_time)
                };
                act = act.timestamps(timestamps);
                
                // Add album art as large image, VYRA logo as small
                let large_image = thumbnail.as_deref().unwrap_or("vyra_logo");
                let assets = activity::Assets::new()
                    .large_image(large_image)
                    .large_text("VYRA Music")
                    .small_image("vyra_logo")
                    .small_text("VYRA");
                act = act.assets(assets);
                
                // Add buttons - Download VYRA (Discord only supports HTTPS URLs)
                let buttons = vec![
                    activity::Button::new("Download VYRA", "https://github.com/HasibulHasan098/VYRA-MUSIC/releases"),
                ];
                act = act.buttons(buttons);
                
                let _ = client.set_activity(act);
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn clear_discord_presence() -> Result<(), String> {
    if let Some(client_arc) = DISCORD_CLIENT.get() {
        if let Ok(mut client_opt) = client_arc.lock() {
            if let Some(client) = client_opt.as_mut() {
                let _ = client.clear_activity();
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn check_for_updates(
    state: State<'_, AppState>,
) -> Result<Value, String> {
    // Fetch latest release from GitHub
    let response = state
        .client
        .get("https://api.github.com/repos/HasibulHasan098/VYRA-MUSIC/releases/latest")
        .header("User-Agent", "VYRA-Music-Updater/1.0")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch releases: {}", e))?;
    
    if response.status().is_success() {
        let release: Value = response.json().await.map_err(|e| format!("Failed to parse release: {}", e))?;
        return Ok(release);
    }
    
    // If /latest fails, try to get all releases
    let response = state
        .client
        .get("https://api.github.com/repos/HasibulHasan098/VYRA-MUSIC/releases")
        .header("User-Agent", "VYRA-Music-Updater/1.0")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch releases: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("GitHub API returned status: {}", response.status()));
    }
    
    let releases: Vec<Value> = response.json().await.map_err(|e| format!("Failed to parse releases: {}", e))?;
    
    if releases.is_empty() {
        return Err("No releases found".to_string());
    }
    
    Ok(releases[0].clone())
}

#[tauri::command]
async fn download_and_install_update(
    state: State<'_, AppState>,
    url: String,
) -> Result<(), String> {
    use std::io::Write;
    use std::process::Command;
    
    // Download the update file
    let response = state
        .client
        .get(&url)
        .header("User-Agent", "VYRA-Music-Updater/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to download update: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }
    
    let bytes = response.bytes().await.map_err(|e| format!("Failed to read update file: {}", e))?;
    
    // Get temp directory
    let temp_dir = std::env::temp_dir();
    let file_name = url.split('/').last().unwrap_or("VYRA_update.exe");
    let update_path = temp_dir.join(file_name);
    
    // Write the update file
    let mut file = std::fs::File::create(&update_path)
        .map_err(|e| format!("Failed to create update file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write update file: {}", e))?;
    
    // Explicitly close the file before running installer
    drop(file);
    
    // Small delay to ensure file is fully released
    std::thread::sleep(std::time::Duration::from_millis(500));
    
    // Run the installer
    #[cfg(target_os = "windows")]
    {
        Command::new(&update_path)
            .spawn()
            .map_err(|e| format!("Failed to run installer: {}", e))?;
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // On non-Windows, just open the file location
        open::that(temp_dir).map_err(|e| format!("Failed to open download location: {}", e))?;
    }
    
    Ok(())
}

// Start audio proxy server with cache support
async fn start_audio_proxy_with_cache(
    stream_urls: Arc<Mutex<HashMap<String, String>>>,
    audio_cache: Arc<Mutex<HashMap<String, Vec<u8>>>>,
    client: Client
) {
    let stream_urls_filter = warp::any().map(move || stream_urls.clone());
    let audio_cache_filter = warp::any().map(move || audio_cache.clone());
    let client_filter = warp::any().map(move || client.clone());

    let audio_route = warp::path!("audio" / String)
        .and(warp::get())
        .and(stream_urls_filter)
        .and(audio_cache_filter)
        .and(client_filter)
        .and(warp::header::optional::<String>("range"))
        .and_then(handle_audio_proxy_with_cache);

    let cors = warp::cors()
        .allow_any_origin()
        .allow_methods(vec!["GET", "OPTIONS"])
        .allow_headers(vec!["Range", "Content-Type"])
        .expose_headers(vec!["Content-Length", "Content-Range", "Accept-Ranges"]);

    let routes = audio_route.with(cors);

    warp::serve(routes).run(([127, 0, 0, 1], 9876)).await;
}

async fn handle_audio_proxy_with_cache(
    video_id: String,
    stream_urls: Arc<Mutex<HashMap<String, String>>>,
    audio_cache: Arc<Mutex<HashMap<String, Vec<u8>>>>,
    client: Client,
    range: Option<String>,
) -> Result<impl warp::Reply, Infallible> {
    // First check cache
    {
        let cache = audio_cache.lock().unwrap();
        if let Some(cached_data) = cache.get(&video_id) {
            let total_len = cached_data.len();
            
            // Handle range requests for cached data
            if let Some(range_header) = &range {
                if let Some(range_str) = range_header.strip_prefix("bytes=") {
                    let parts: Vec<&str> = range_str.split('-').collect();
                    if parts.len() == 2 {
                        let start: usize = parts[0].parse().unwrap_or(0);
                        let end: usize = if parts[1].is_empty() {
                            total_len - 1
                        } else {
                            parts[1].parse().unwrap_or(total_len - 1)
                        };
                        
                        let end = end.min(total_len - 1);
                        let chunk = cached_data[start..=end].to_vec();
                        
                        return Ok(warp::http::Response::builder()
                            .status(206)
                            .header("Content-Type", "audio/webm")
                            .header("Accept-Ranges", "bytes")
                            .header("Content-Length", chunk.len().to_string())
                            .header("Content-Range", format!("bytes {}-{}/{}", start, end, total_len))
                            .body(chunk)
                            .unwrap());
                    }
                }
            }
            
            // Return full cached data
            return Ok(warp::http::Response::builder()
                .status(200)
                .header("Content-Type", "audio/webm")
                .header("Accept-Ranges", "bytes")
                .header("Content-Length", total_len.to_string())
                .body(cached_data.clone())
                .unwrap());
        }
    }

    // Not in cache, fetch from URL
    let url = {
        let guard = stream_urls.lock().unwrap();
        guard.get(&video_id).cloned()
    };

    if let Some(url) = url {
        // Parse the range request and limit it for faster initial load
        let fetch_range = match &range {
            None => Some("bytes=0-262143".to_string()), // First 256KB if no range
            Some(r) => {
                // Parse range like "bytes=0-" or "bytes=0-1000"
                if let Some(range_str) = r.strip_prefix("bytes=") {
                    let parts: Vec<&str> = range_str.split('-').collect();
                    if parts.len() == 2 {
                        let start: u64 = parts[0].parse().unwrap_or(0);
                        let end: Option<u64> = if parts[1].is_empty() {
                            None // Open-ended range like "bytes=0-"
                        } else {
                            parts[1].parse().ok()
                        };
                        
                        // If open-ended or requesting more than 512KB, limit to 512KB chunk
                        let chunk_size: u64 = 524288; // 512KB
                        let actual_end = match end {
                            Some(e) if e - start <= chunk_size => e,
                            _ => start + chunk_size - 1,
                        };
                        
                        Some(format!("bytes={}-{}", start, actual_end))
                    } else {
                        Some(r.clone())
                    }
                } else {
                    Some(r.clone())
                }
            }
        };
        
        let mut request = client
            .get(&url)
            .header("User-Agent", "com.google.android.apps.youtube.vr.oculus/1.43.32")
            .header("Accept", "*/*");

        if let Some(r) = &fetch_range {
            request = request.header("Range", r.clone());
        }

        match request.send().await {
            Ok(response) => {
                let status = response.status();
                let content_type = response
                    .headers()
                    .get("content-type")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("audio/webm")
                    .to_string();
                let content_length = response
                    .headers()
                    .get("content-length")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string());
                let content_range = response
                    .headers()
                    .get("content-range")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string());

                match response.bytes().await {
                    Ok(bytes) => {
                        // Always return 206 Partial Content when we fetched a range
                        // This tells the browser to request more data
                        let response_status = if fetch_range.is_some() { 206 } else { status.as_u16() };

                        let mut builder = warp::http::Response::builder()
                            .status(response_status)
                            .header("Content-Type", content_type)
                            .header("Accept-Ranges", "bytes");

                        if let Some(cl) = content_length {
                            builder = builder.header("Content-Length", cl);
                        }
                        if let Some(cr) = content_range {
                            builder = builder.header("Content-Range", cr);
                        }

                        Ok(builder.body(bytes.to_vec()).unwrap())
                    }
                    Err(_) => {
                        Ok(warp::http::Response::builder()
                            .status(500)
                            .body(vec![])
                            .unwrap())
                    }
                }
            }
            Err(_) => {
                Ok(warp::http::Response::builder()
                    .status(500)
                    .body(vec![])
                    .unwrap())
            }
        }
    } else {
        Ok(warp::http::Response::builder()
            .status(404)
            .body(format!("No stream URL for video: {}", video_id).into_bytes())
            .unwrap())
    }
}

fn main() {
    let client = Client::builder()
        .build()
        .expect("Failed to create HTTP client");

    let stream_urls = Arc::new(Mutex::new(HashMap::new()));
    let audio_cache = Arc::new(Mutex::new(HashMap::new()));
    let stream_urls_for_proxy = stream_urls.clone();
    let audio_cache_for_proxy = audio_cache.clone();
    let client_for_proxy = client.clone();

    // Start audio proxy server in background
    std::thread::spawn(move || {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(_) => {
                return;
            }
        };
        rt.block_on(async {
            // Small delay to ensure main app is ready
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            start_audio_proxy_with_cache(stream_urls_for_proxy, audio_cache_for_proxy, client_for_proxy).await;
        });
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, show and focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // Initialize Windows media controls (SMTC)
            let app_handle = app.handle().clone();
            if let Some(controls) = init_media_controls(app_handle) {
                let _ = MEDIA_CONTROLS.set(controls);
            }
            
            // Initialize Discord RPC
            let discord_client = init_discord_rpc();
            let _ = DISCORD_CLIENT.set(Arc::new(Mutex::new(discord_client)));
            
            // Create system tray with media controls
            let prev = MenuItem::with_id(app, "prev", "⏮ Previous", true, None::<&str>)?;
            let play_pause = MenuItem::with_id(app, "play_pause", "⏯ Play/Pause", true, None::<&str>)?;
            let next = MenuItem::with_id(app, "next", "⏭ Next", true, None::<&str>)?;
            let separator = MenuItem::with_id(app, "sep", "─────────", false, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show VYRA", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&prev, &play_pause, &next, &separator, &show, &quit])?;
            
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("VYRA - YouTube Music")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "prev" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("media-control", "prev");
                            }
                        }
                        "play_pause" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("media-control", "play_pause");
                            }
                        }
                        "next" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.emit("media-control", "next");
                            }
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .manage(AppState {
            client,
            visitor_data: Mutex::new(None),
            stream_urls,
            audio_cache,
        })
        .invoke_handler(tauri::generate_handler![
            yt_browse,
            yt_search,
            yt_suggestions,
            yt_next,
            yt_stream,
            download_track,
            select_folder,
            cache_audio,
            get_cached_audio,
            clear_audio_cache,
            open_url,
            update_media_metadata,
            update_media_playback,
            update_discord_presence,
            clear_discord_presence,
            check_for_updates,
            download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
