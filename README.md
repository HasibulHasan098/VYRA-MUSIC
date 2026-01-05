<p align="center">
  <img src="icon.png" alt="VYRA" width="120" height="120">
</p>

<h1 align="center">VYRA</h1>

<p align="center">
  <strong>A beautiful YouTube Music desktop client</strong>
</p>

<p align="center">
  <a href="https://vyra.fasthand.study/">
    <img src="https://img.shields.io/badge/Download-v1.0.8-blue?style=flat-square" alt="Download">
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

## 🆕 What's New in v1.0.8

### New Features
- **Windows Taskbar Thumbnail Toolbar** — Media control buttons (Previous, Play/Pause, Next) now appear on the Windows taskbar thumbnail preview
- **Dynamic Play/Pause Button** — Taskbar button automatically switches between play and pause icons based on playback state

### Improvements
- **Professional Icons** — Using high-quality PNG icons for taskbar buttons with proper transparency and anti-aliasing
- **Better Windows Integration** — Enhanced native Windows experience with thumbnail toolbar controls


## 🚀 Installation

### Windows

1. Download the latest installer from [vyra.fasthand.study](https://vyra.fasthand.study/)
2. Run `VYRA_1.0.8_x64-setup.exe`
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

| Technology | Purpose |
|------------|---------|
| [Tauri](https://tauri.app/) | Desktop framework |
| [React](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [Rust](https://www.rust-lang.org/) | Backend & audio proxy |

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

Settings are available in the app:

- **Theme** — Dark/Light mode
- **Download Location** — Choose where to save downloads
- **Download Quality** — Normal (128kbps), High (256kbps), Very High (320kbps)
- **Close to Tray** — Minimize to system tray on close
- **Cache Music** — Cache songs for faster playback
- **Check for Updates** — Manually check for new versions

## 🎤 Lyrics

VYRA uses [LRCLIB](https://lrclib.net/) for synchronized lyrics:
- Click the microphone icon in the player to toggle lyrics
- Lyrics automatically sync with playback
- Click any line to seek to that position
- Works in both normal and fullscreen modes

## � CWindows Taskbar Thumbnail Toolbar (For Tauri Developers)

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

## Disclaimer: VYRA is an independent, open-source project and is not affiliated with, endorsed by, or associated with YouTube, YouTube Music, or Google in any way. VYRA simply provides an alternative interface to access publicly available content. All trademarks and brand names belong to their respective owners.


## 👨‍💻 Author

**FASTHAND**

- Website: [vyra.fasthand.study](https://vyra.fasthand.study/)
- GitHub: [@HasibulHasan098](https://github.com/HasibulHasan098)

---

<p align="center">
  Made with ❤️ by FASTHAND
</p>
