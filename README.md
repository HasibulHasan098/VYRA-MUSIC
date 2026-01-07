<p align="center">
  <img src="icon.png" alt="VYRA" width="120" height="120">
</p>

<h1 align="center">VYRA</h1>

<p align="center">
  <strong>A beautiful YouTube Music desktop client</strong>
</p>

<p align="center">
  <a href="https://vyra.fasthand.study/">
    <img src="https://img.shields.io/badge/Download-v1.1.0-blue?style=flat-square" alt="Download">
  </a>
  <a href="https://github.com/HasibulHasan098/VYRA-MUSIC/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/HasibulHasan098/VYRA-MUSIC?style=flat-square" alt="License">
  </a>
  <a href="https://github.com/HasibulHasan098/VYRA-MUSIC">
    <img src="https://img.shields.io/github/stars/HasibulHasan098/VYRA-MUSIC?style=flat-square" alt="Stars">
  </a>
</p>

---

## ✨ Features

- 🎵 **Stream Music** — Play any song from YouTube Music instantly
- 🔍 **Search** — Find songs, artists, albums, and playlists
- 📥 **Download** — Save songs for offline listening
- 🎨 **Beautiful UI** — Modern iOS-inspired design with dark/light themes
- ⚡ **Fast** — Instant playback with smart buffering
- 🔄 **Queue Management** — Create and manage your play queue
- ❤️ **Liked Songs** — Save your favorite tracks
- 📁 **Playlists** — Create custom playlists
- 👤 **Follow Artists** — Follow artists and get recommendations
- 💾 **Data Backup** — Export/Import your data with `.vyra` files
- 🖥️ **System Tray** — Minimize to tray with media controls
- 🔒 **Single Instance** — Only one app window at a time
- 🎤 **Synced Lyrics** — Real-time lyrics with karaoke-style animation
- 🖼️ **Fullscreen Mode** — Immersive fullscreen player with lyrics view
- 🎶 **Auto-queue** — Automatically fetches related songs when queue ends
- 📴 **Offline Cache** — Cache songs for offline playback
- 🔔 **Auto-Updates** — Check for updates and install with one click
- 🎮 **Discord RPC** — Show what you're listening to on Discord
- 🎧 **Spotify Import** — Import playlists and albums from Spotify
- 📺 **YouTube Music Import** — Import playlists from YouTube Music

## 🆕 What's New in v1.1.0

### 🎉 Big Update!

#### Playlist Import Features
- 🎧 **Spotify Import** — Import playlists and albums from Spotify URLs
  - Paste any public Spotify playlist or album URL
  - Preview tracks before importing with song thumbnails
  - Automatic matching to YouTube Music catalog
  - Progress bar showing import status
- 📺 **YouTube Music Import** — Import playlists from YouTube Music URLs
  - Paste any public YouTube Music playlist URL
  - Preview all tracks before creating playlist
  - One-click import to your library

#### Playlist Management
- ✏️ **Rename Playlists** — Right-click any playlist to rename it
- 🗑️ **Delete Playlists** — Right-click to delete playlists with confirmation
- 📋 **Context Menu** — New right-click menu for playlist options
- ⚙️ **Playlist Options** — Three-dot menu in playlist view for quick actions

#### UI Improvements
- 🎨 **Import Buttons** — Quick access import buttons in Library (Spotify & YouTube icons)
- 📊 **Import Preview** — See playlist info and track list before importing
- 🔄 **Progress Tracking** — Real-time progress bars during import


## 🚀 Installation

### Windows

1. Download the latest installer from [vyra.fasthand.study](https://vyra.fasthand.study/)
2. Run `VYRA_1.1.0_x64-setup.exe`
3. Follow the installation wizard

### Build from Source

```bash
# Clone the repository
git clone https://github.com/HasibulHasan098/VYRA-MUSIC.git
cd VYRA-MUSIC

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

> **Note for Developers:** If you encounter timeout errors during build (especially with crates.io), you may need to use a VPN. This is due to occasional server issues with crates.io or regional connectivity problems.

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| [React](https://react.dev/) | 18.2 | UI library |
| [TypeScript](https://www.typescriptlang.org/) | 5.3 | Type safety |
| [Vite](https://vitejs.dev/) | 5.0 | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | 3.3 | Utility-first CSS framework |
| [Zustand](https://zustand-demo.pmnd.rs/) | 4.4 | State management |
| [Lucide React](https://lucide.dev/) | 0.294 | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| [Tauri](https://tauri.app/) | 2.0 | Desktop framework |
| [Rust](https://www.rust-lang.org/) | 2021 Edition | Backend & audio proxy |
| [Reqwest](https://docs.rs/reqwest/) | 0.12 | HTTP client |
| [Warp](https://docs.rs/warp/) | 0.3 | Web server for audio streaming |
| [Tokio](https://tokio.rs/) | 1.0 | Async runtime |
| [Souvlaki](https://docs.rs/souvlaki/) | 0.7 | Media controls integration |
| [Discord RPC](https://docs.rs/discord-rich-presence/) | 0.2 | Discord Rich Presence |

## 📁 Project Structure

```
vyra/
├── src/                    # React frontend
│   ├── api/               # YouTube API, Lyrics, Updater
│   ├── components/        # UI components
│   ├── store/             # Zustand stores
│   └── views/             # Page views
├── src-tauri/             # Tauri/Rust backend
│   └── src/
│       └── main.rs        # Backend logic & audio proxy
└── package.json
```

## ⚙️ Configuration

Settings are available in the app (click the gear icon):

### General Settings
- **Theme** — Dark/Light mode toggle
- **Accent Color** — Customize the app's accent color
- **Close to Tray** — Minimize to system tray instead of closing
- **Discord Rich Presence** — Show what you're listening to on Discord
- **Autoplay** — Automatically play related songs when queue ends

### Download Settings
- **Download Location** — Choose where to save downloads
- **Download Quality** — Normal (128kbps), High (256kbps), Very High (320kbps)

### Cache Settings
- **Enable Cache** — Cache songs for faster playback and offline listening
- **Max Cached Songs** — Set the maximum number of songs to cache (1-999)

### Keybinds
- **In-App Keybinds** — Customize keyboard shortcuts within the app
- **Global Keybinds** — Control playback even when app is in background
  - Play/Pause, Next, Previous, Volume Up/Down, Mute, Like, Lyrics

### Equalizer
- **10+ Presets** — Acoustic, Bass Booster, Classical, Dance, Electronic, Hip-Hop, Jazz, Pop, Rock, and more
- **Custom EQ** — Create your own equalizer settings with 6 bands (60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 15kHz)

### Data Management
- **Export Data** — Backup your liked songs, playlists, and settings to a `.vyra` file
- **Import Data** — Restore your data from a backup file
- **Import from Spotify** — Import playlists and albums from Spotify URLs
- **Import from YouTube Music** — Import playlists from YouTube Music URLs
- **Clear Data** — Clear history, liked songs, downloads, playlists, or followed artists

## 🎤 Lyrics

VYRA uses [LRCLIB](https://lrclib.net/) for synchronized lyrics:
- Click the microphone icon in the player to toggle lyrics
- Lyrics automatically sync with playback
- Click any line to seek to that position
- Works in both normal and fullscreen modes
- Karaoke-style word-by-word animation

## 🎹 Keyboard Shortcuts

### Default In-App Shortcuts
- `Space` — Play/Pause
- `→` — Next track
- `←` — Previous track
- `↑` — Volume up
- `↓` — Volume down
- `M` — Mute/Unmute
- `L` — Like/Unlike current song
- `K` — Toggle lyrics

### Global Shortcuts (Optional)
- `Ctrl+Space` — Play/Pause
- `Ctrl+→` — Next track
- `Ctrl+←` — Previous track
- `Ctrl+↑` — Volume up
- `Ctrl+↓` — Volume down
- `Ctrl+M` — Mute/Unmute

> **Note:** All shortcuts are customizable in Settings → Keybinds

## 🎮 Media Controls

VYRA integrates with system media controls:
- **Windows Taskbar** — Previous, Play/Pause, Next buttons on taskbar thumbnail
- **System Tray** — Quick access to playback controls
- **Media Keys** — Use keyboard media keys to control playback
- **Discord RPC** — Show currently playing song on Discord profile

## 🪟 Windows Taskbar Thumbnail Toolbar (For Tauri Developers)

VYRA implements Windows Taskbar Thumbnail Toolbar buttons using the unofficial method with `ITaskbarList3` COM interface. This guide helps other Tauri developers implement similar functionality.

> **Build Note:** If you encounter timeout errors when building with these dependencies (especially downloading from crates.io), try using a VPN. This is due to occasional server issues with crates.io or regional connectivity problems.

### Implementation Overview

1. **Add Windows Dependencies** to `Cargo.toml`:
```toml
[target.'cfg(windows)'.dependencies]
windows = { version = "0.58", features = [
    "Win32_UI_Shell",
    "Win32_UI_WindowsAndMessaging",
    "Win32_UI_Controls",
    "Win32_Foundation",
    "Win32_Graphics_Gdi",
    "Win32_System_LibraryLoader",
    "Win32_System_Com",
] }
image = "0.25"  # For loading PNG icons
```

2. **Key Components**:
   - Use `ITaskbarList3::ThumbBarAddButtons` to add buttons
   - Use `ITaskbarList3::ThumbBarUpdateButtons` to update button states
   - Subclass the window to intercept `WM_COMMAND` messages for button clicks
   - Use `include_bytes!` to embed PNG icons in the binary

3. **Button Updates**:
   - Store the window HWND in a static `AtomicIsize`
   - Create a new `ITaskbarList3` instance when updating (COM interfaces can't be stored in statics)
   - Use `THB_ICON` flag to update button icons dynamically

4. **Icon Format**:
   - 16x16 PNG images work best
   - Convert to HICON using `CreateDIBSection` and `CreateIconIndirect`
   - Use premultiplied alpha for proper transparency

### Example Code Structure

```rust
#[cfg(target_os = "windows")]
mod taskbar_buttons {
    // 1. Define button IDs
    pub const BTN_PREV: u32 = 0;
    pub const BTN_PLAY: u32 = 1;
    pub const BTN_NEXT: u32 = 2;
    
    // 2. Store HWND for updates
    static HWND_MAIN: AtomicIsize = AtomicIsize::new(0);
    
    // 3. Initialize buttons on app start
    pub fn init_taskbar_buttons(app_handle: AppHandle, hwnd: isize) {
        // Create ITaskbarList3, add buttons
    }
    
    // 4. Update button state
    pub fn update_button(button_id: u32, new_icon: HICON) {
        // Create new ITaskbarList3, call ThumbBarUpdateButtons
    }
}
```

### Resources
- [Microsoft ITaskbarList3 Documentation](https://learn.microsoft.com/en-us/windows/win32/api/shobjidl_core/nn-shobjidl_core-itaskbarlist3)
- [VYRA Source Code](https://github.com/HasibulHasan098/VYRA-MUSIC) - See `src-tauri/src/main.rs` for full implementation

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

VYRA is an independent, open-source project and is not affiliated with, endorsed by, or associated with YouTube, YouTube Music, or Google in any way. VYRA simply provides an alternative interface to access publicly available content from YouTube Music. All trademarks and brand names belong to their respective owners.

## 🐛 Known Issues

- Some songs may not have synchronized lyrics available
- Download feature requires desktop app (not available in web version)
- First-time cache building may take a few seconds

## 💡 Tips & Tricks

- **Quick Search** — Start typing anywhere to search
- **Right-Click Menu** — Right-click on any song or playlist for more options
- **Mini Player** — Click the picture-in-picture icon for a compact player window
- **Fullscreen Mode** — Click the fullscreen icon for an immersive experience
- **Offline Mode** — Cached songs automatically appear when you're offline
- **Import Playlists** — Use the Spotify/YouTube icons in Library to import playlists
- **Rename Playlists** — Right-click any playlist to rename or delete it


## 👨‍💻 Author

**FASTHAND**

- Website: [vyra.fasthand.study](https://vyra.fasthand.study/)
- GitHub: [@HasibulHasan098](https://github.com/HasibulHasan098)

---

<p align="center">
  Made with ❤️ by FASTHAND
</p>
