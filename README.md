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
- 🖥️ **System Tray** — Minimize to tray with media controls
- 🔒 **Single Instance** — Only one app window at a time
- 🎤 **Synced Lyrics** — Real-time lyrics with karaoke-style animation
- 🖼️ **Fullscreen Mode** — Immersive fullscreen player with lyrics view
- � **Auto-queue** — Automatically fetches related songs when queue ends
- 🔔 **Auto-Updates** — Check for updates and install with one click

## 🆕 What's New in v1.0.2

### Improved Queue System
- **Infinite Queue** — Queue now automatically extends with 50 related songs when running low
- **Smart Queue Extension** — Fetches new songs when fewer than 6 tracks remain
- **No More Empty Queue** — Even rapid clicking through songs keeps the queue full

### Settings Reorganization
- **Organized Settings** — Settings page reorganized into logical sections: Appearance, Playback, Storage, Behavior, Account, About
- **Equalizer in Playback** — EQ settings moved under Playback section for better organization

### Equalizer Presets
- **20 EQ Presets** — Added all Spotify-style presets: Flat, Acoustic, Bass Booster, Classical, Dance, Deep, Electronic, Hip-Hop, Jazz, Latin, Loudness, Lounge, Piano, Pop, R&B, Rock, Small Speakers, Spoken Word, Treble Booster, and more

### Enhanced Home Page
- **More Content** — Home page now fetches from multiple YouTube Music endpoints
- **Genre Sections** — Added genre-based sections like Pop Hits, Chill Vibes, Workout, etc.
- **No Videos** — Filtered out video sections to show only music content

### Thumbnail Quality Fix
- **High Quality Thumbnails** — Fixed black borders on YouTube thumbnails
- **Proper Cropping** — Thumbnails now properly cropped without quality loss

### Autoplay Control
- **Autoplay Toggle** — Autoplay setting now properly stops playback when disabled

## 🚀 Installation

### Windows

1. Download the latest installer from [Releases](https://github.com/HasibulHasan098/VYRA-MUSIC/releases)
2. Run `VYRA_1.0.2_x64-setup.exe`
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
