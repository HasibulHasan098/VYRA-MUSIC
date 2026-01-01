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


## 🚀 Installation

### Windows

1. Download the latest installer from [Releases](https://github.com/HasibulHasan098/VYRA-MUSIC/releases)
2. Run `VYRA_x.x.x_x64-setup.exe`
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
│   ├── api/               # YouTube API integration
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
