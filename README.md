<p align="center">
  <img src="icon.png" alt="VYRA" width="120" height="120">
</p>

<h1 align="center">VYRA</h1>

<p align="center">
  <strong>A beautiful YouTube Music desktop client</strong>
</p>

<p align="center">
  <a href="https://github.com/HasibulHasan098/VYRA-MUSIC/releases">
    <img src="https://img.shields.io/github/v/release/HasibulHasan098/VYRA-MUSIC?style=flat-square" alt="Release">
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
- � ***Follow Artists** — Follow artists and get recommendations
- � ***Data Backup** — Export/Import your data with `.vyra` files
- 🖥️ **System Tray** — Minimize to tray with media controls
- �  **Single Instance** — Only one app window at a time
- 🎤 **Synced Lyrics** — Real-time lyrics with karaoke-style animation
- �️* **Fullscreen Mode** — Immersive fullscreen player with lyrics view
- 🎶 **Auto-queue** — Automatically fetches related songs when queue ends
- 📴 **Offline Cache** — Cache songs for offline playback
- 🔔 **Auto-Updates** — Check for updates and install with one click

## 🆕 What's New in v1.0.5

### Follow Artists
- **Follow Button** — Follow your favorite artists from their artist page
- **Artists Library** — View all followed artists in the Library tab
- **Sidebar Artists** — Quick access to followed artists in the sidebar (up to 3 shown)
- **Artist Recommendations** — Get song recommendations from artists you follow on the home page
- **Persistent Data** — Followed artists are saved locally

### Data Management
- **Export Data** — Save your data to a `.vyra` backup file
  - Choose what to export: History, Liked Songs, Artists, Downloads, Playlists
  - Select save location with file picker dialog
  - Select All option for quick selection
- **Import Data** — Restore data from a `.vyra` backup file
  - **Merge Mode** — Add imported data to existing data (duplicates ignored)
  - **Fresh Start Mode** — Replace existing data with imported data
  - Shows what data is available in the backup
  - Select which data types to import
- **Clear Data** — Selectively clear your data
  - Choose what to clear: History, Liked Songs, Artists, Downloads, Playlists
  - Confirmation popup with round checkboxes
  - Select All option

### Improved Sidebar
- **Song Thumbnails** — Library items (Liked Songs, Recently Played, Downloads) show stacked song thumbnails
- **Artists Section** — Dedicated section for followed artists with divider
- **Vertical Artist List** — Shows up to 3 artists vertically with proper images
- **See All Button** — Quick access to full artists list in both collapsed and expanded modes
- **Click to Open** — Clicking an artist opens their artist page directly

### Music Caching
- **Offline Playback** — Songs are cached after finishing playback
- **Adjustable Cache Limit** — Set cache limit from 1 to 999 songs (default: 40)
- **Cache Limit Slider** — Beautiful slider with draggable thumb appears when caching is enabled
- **Offline Banner** — Shows cached songs section when offline
- **Toggle in Settings** — Enable/disable caching in Storage settings

### UI Improvements
- **Cleaner Sidebar** — Removed song count from library items for cleaner look
- **Better Spacing** — Improved spacing in collapsed and expanded sidebar modes
- **Round Checkboxes** — Modern round checkbox design in data management modals

### Installer & Bug Fixes
- **Removed Inno Setup** — Switched to Tauri's built-in NSIS installer
- **Auto-Uninstall Old Versions** — Automatically removes old Inno Setup installations when upgrading
- **Fixed Freezing at Start** — Resolved app freezing issue on startup

## 🚀 Installation

### Windows

1. Download the latest installer from [Releases](https://github.com/HasibulHasan098/VYRA-MUSIC/releases)
2. Run `VYRA_1.0.5_x64-setup.exe`
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
# Installer will be at: src-tauri/target/release/bundle/nsis/VYRA_x.x.x_x64-setup.exe
npm run tauri:build
```

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

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**FASTHAND**

- GitHub: [@HasibulHasan098](https://github.com/HasibulHasan098)

---

<p align="center">
  Made with ❤️ by FASTHAND
</p>
