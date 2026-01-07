import { useState, useEffect } from 'react'
import {
  Moon,
  Sun,
  Download,
  Upload,
  Info,
  ExternalLink,
  Github,
  FolderOpen,
  Check,
  HardDrive,
  Trash2,
  X,
  RefreshCw,
  ArrowDownCircle,
  Loader2,
  MessageCircle,
  Repeat,
  SlidersHorizontal,
  Keyboard,
  Music,
  AlertCircle,
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { usePlayerStore } from '../store/playerStore'
import { isUpdateAvailable, getCurrentVersion, downloadAndInstallUpdate, openReleasesPage, ReleaseInfo } from '../api/updater'
import { fetchSpotifyData, matchSpotifyTrack, SpotifyImportResult } from '../api/spotify'
import { youtube, Song } from '../api/youtube'

// Extend Window interface for Tauri
declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

export default function SettingsView() {
  const {
    darkMode,
    toggleDarkMode,
    downloadPath,
    setDownloadPath,
    downloadQuality,
    setDownloadQuality,
    cacheEnabled,
    toggleCacheEnabled,
    cachedSongs,
    maxCachedSongs,
    setMaxCachedSongs,
    clearCache,
    minimizeToTray,
    toggleMinimizeToTray,
    discordRpcEnabled,
    toggleDiscordRpc,
    autoplayEnabled,
    toggleAutoplay,
    equalizerEnabled,
    toggleEqualizer,
    equalizerPreset,
    setEqualizerPreset,
    equalizerBands,
    setEqualizerBand,
    resetEqualizer,
    accentColor,
    setAccentColor,
    globalKeybindsEnabled,
    toggleGlobalKeybinds,
    inAppKeybinds,
    globalKeybinds,
    setInAppKeybind,
    setGlobalKeybind,
    resetInAppKeybinds,
    resetGlobalKeybinds,
    clearHistory,
    clearLikedSongs,
    clearFollowedArtists,
    clearDownloads,
    clearPlaylists,
    followedArtists,
    userPlaylists,
    downloadedSongs,
    createPlaylist,
    addToPlaylist,
  } = useAppStore()
  const { likedSongs, recentlyPlayed } = usePlayerStore()
  const [showQualityDropdown, setShowQualityDropdown] = useState(false)
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [showAccentPicker, setShowAccentPicker] = useState(false)
  const [hexInput, setHexInput] = useState(accentColor)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<ReleaseInfo | null>(null)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [showReleaseNotes, setShowReleaseNotes] = useState(false)
  const [editingKeybind, setEditingKeybind] = useState<string | null>(null)
  const [keybindTab, setKeybindTab] = useState<'inapp' | 'global'>('inapp')
  const [currentKeys, setCurrentKeys] = useState<string>('')
  const [showClearDataModal, setShowClearDataModal] = useState(false)
  const [clearDataOptions, setClearDataOptions] = useState({
    history: false,
    liked: false,
    artists: false,
    downloads: false,
    playlists: false,
  })
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    history: true,
    liked: true,
    artists: true,
    downloads: true,
    playlists: true,
  })
  const [importOptions, setImportOptions] = useState({
    history: true,
    liked: true,
    artists: true,
    downloads: true,
    playlists: true,
  })
  const [importMode, setImportMode] = useState<'merge' | 'fresh'>('merge')
  const [importedData, setImportedData] = useState<any>(null)
  const [importFileName, setImportFileName] = useState<string>('')

  // Spotify import state
  const [showSpotifyImportModal, setShowSpotifyImportModal] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [spotifyImportStatus, setSpotifyImportStatus] = useState<'idle' | 'fetching' | 'matching' | 'done' | 'error'>('idle')
  const [spotifyData, setSpotifyData] = useState<SpotifyImportResult | null>(null)
  const [spotifyMatchedSongs, setSpotifyMatchedSongs] = useState<Song[]>([])
  const [spotifyMatchProgress, setSpotifyMatchProgress] = useState({ current: 0, total: 0, stage: '' })
  const [spotifyError, setSpotifyError] = useState<string | null>(null)

  // YouTube Music import state
  const [showYTImportModal, setShowYTImportModal] = useState(false)
  const [ytUrl, setYtUrl] = useState('')
  const [ytImportStatus, setYtImportStatus] = useState<'idle' | 'fetching' | 'done' | 'creating' | 'created' | 'error'>('idle')
  const [ytProgress, setYtProgress] = useState({ current: 0, total: 0, stage: '' })
  const [ytError, setYtError] = useState<string | null>(null)
  const [ytPlaylistData, setYtPlaylistData] = useState<{ title: string; thumbnail: string; songs: Song[] } | null>(null)

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates()
  }, [])

  const checkForUpdates = async () => {
    setCheckingUpdate(true)
    setUpdateError(null)
    try {
      const result = await isUpdateAvailable()
      setUpdateAvailable(result.available)
      setUpdateInfo(result.release)
    } catch (error) {
      setUpdateError('Failed to check for updates')
    }
    setCheckingUpdate(false)
  }

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      // No direct download, open releases page
      openReleasesPage()
      return
    }

    setDownloadingUpdate(true)
    setUpdateError(null)
    try {
      const success = await downloadAndInstallUpdate(updateInfo.downloadUrl)
      if (!success) {
        setUpdateError('Failed to download update')
      }
    } catch (error) {
      setUpdateError('Failed to download update')
    }
    setDownloadingUpdate(false)
  }

  const qualityOptions = [
    { value: 'normal', label: 'Normal', description: '128 kbps' },
    { value: 'high', label: 'High', description: '256 kbps' },
    { value: 'very_high', label: 'Very High', description: '320 kbps' },
  ] as const

  const currentQuality =
    qualityOptions.find((q) => q.value === downloadQuality) || qualityOptions[1]

  // Accent color presets
  const accentPresets = [
    { name: 'Blue', color: '#007AFF' },
    { name: 'Purple', color: '#AF52DE' },
    { name: 'Pink', color: '#FF2D55' },
    { name: 'Red', color: '#FF3B30' },
    { name: 'Orange', color: '#FF9500' },
    { name: 'Yellow', color: '#FFCC00' },
    { name: 'Green', color: '#34C759' },
    { name: 'Teal', color: '#5AC8FA' },
    { name: 'Indigo', color: '#5856D6' },
  ]

  // Validate and apply hex color
  const handleHexChange = (value: string) => {
    setHexInput(value)
    // Auto-add # if missing
    const hex = value.startsWith('#') ? value : `#${value}`
    // Validate hex format
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setAccentColor(hex.toUpperCase())
    }
  }

  // Sync hex input when accent color changes from presets
  useEffect(() => {
    setHexInput(accentColor.toUpperCase())
  }, [accentColor])

  // Global keydown/keyup listener for keybind recording
  useEffect(() => {
    if (!editingKeybind) {
      setCurrentKeys('')
      return
    }

    const pressedKeys = new Set<string>()

    const buildKeyString = (e: KeyboardEvent) => {
      const parts: string[] = []
      
      // Only allow ONE modifier (priority: Ctrl > Alt > Shift > Meta)
      if (e.ctrlKey || pressedKeys.has('Control')) {
        parts.push('Ctrl')
      } else if (e.altKey || pressedKeys.has('Alt')) {
        parts.push('Alt')
      } else if (e.shiftKey || pressedKeys.has('Shift')) {
        parts.push('Shift')
      } else if (e.metaKey || pressedKeys.has('Meta')) {
        parts.push('Meta')
      }

      // Add only ONE non-modifier key
      for (const key of pressedKeys) {
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
          const keyName =
            key === ' ' ? 'Space' :
            key === 'ArrowUp' ? 'Up' :
            key === 'ArrowDown' ? 'Down' :
            key === 'ArrowLeft' ? 'Left' :
            key === 'ArrowRight' ? 'Right' :
            key.length === 1 ? key.toUpperCase() : key
          parts.push(keyName)
          break // Only one non-modifier key allowed
        }
      }
      return parts.join('+')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setEditingKeybind(null)
        setCurrentKeys('')
        return
      }

      // Count current non-modifier keys
      const nonModifierKeys = Array.from(pressedKeys).filter(
        k => !['Control', 'Alt', 'Shift', 'Meta'].includes(k)
      )
      
      // Only add if we don't already have a non-modifier key (limit to 2 keys total: 1 modifier + 1 key)
      const isModifier = ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)
      if (isModifier || nonModifierKeys.length === 0) {
        pressedKeys.add(e.key)
      }
      
      setCurrentKeys(buildKeyString(e))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const releasedKey = e.key
      const isModifier = ['Control', 'Alt', 'Shift', 'Meta'].includes(releasedKey)

      // If a non-modifier key was released, save the combo
      if (!isModifier && pressedKeys.has(releasedKey)) {
        const finalKeys = buildKeyString(e)
        
        const isGlobal = editingKeybind.startsWith('global-')
        const action = editingKeybind.replace('inapp-', '').replace('global-', '')

        // Check for unbind keys
        if (releasedKey === 'Backspace' || releasedKey === 'Delete') {
          if (isGlobal) {
            setGlobalKeybind(action, '')
          } else {
            setInAppKeybind(action, '')
          }
        } else if (finalKeys) {
          if (isGlobal) {
            setGlobalKeybind(action, finalKeys)
          } else {
            setInAppKeybind(action, finalKeys)
          }
        }
        
        pressedKeys.clear()
        setEditingKeybind(null)
        setCurrentKeys('')
      } else {
        // Just a modifier released, update display
        pressedKeys.delete(releasedKey)
        setCurrentKeys(buildKeyString(e))
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [editingKeybind, setInAppKeybind, setGlobalKeybind])

  const handleSelectFolder = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        const selected = await invoke<string | null>('select_folder')
        if (selected) {
          setDownloadPath(selected)
        }
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error)
    }
  }

  const handleClearCache = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('clear_audio_cache')
      }
      clearCache()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  const openExternalLink = async (url: string) => {
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('open_url', { url })
      } else {
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Failed to open link:', error)
      // Fallback
      window.open(url, '_blank')
    }
  }

  const handleClearData = () => {
    if (clearDataOptions.history) clearHistory()
    if (clearDataOptions.liked) clearLikedSongs()
    if (clearDataOptions.artists) clearFollowedArtists()
    if (clearDataOptions.downloads) clearDownloads()
    if (clearDataOptions.playlists) clearPlaylists()
    
    // Reset options and close modal
    setClearDataOptions({
      history: false,
      liked: false,
      artists: false,
      downloads: false,
      playlists: false,
    })
    setShowClearDataModal(false)
  }

  const hasSelectedClearOption = Object.values(clearDataOptions).some(v => v)
  const hasSelectedExportOption = Object.values(exportOptions).some(v => v)
  const hasSelectedImportOption = Object.values(importOptions).some(v => v)

  // Export data to .vyra file
  const handleExportData = async () => {
    const exportData: any = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {},
    }

    if (exportOptions.history) exportData.data.recentlyPlayed = recentlyPlayed
    if (exportOptions.liked) exportData.data.likedSongs = likedSongs
    if (exportOptions.artists) exportData.data.followedArtists = followedArtists
    if (exportOptions.downloads) exportData.data.downloadedSongs = downloadedSongs
    if (exportOptions.playlists) exportData.data.userPlaylists = userPlaylists

    const jsonContent = JSON.stringify(exportData, null, 2)
    const defaultFileName = `vyra-backup-${new Date().toISOString().split('T')[0]}.vyra`

    // Try to use Tauri save dialog if available
    if (typeof window !== 'undefined' && window.__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const filePath = await invoke<string | null>('save_file_dialog', {
          defaultName: defaultFileName,
          filters: [{ name: 'VYRA Backup', extensions: ['vyra'] }],
        })

        if (filePath) {
          await invoke('write_text_file', { path: filePath, content: jsonContent })
          setShowExportModal(false)
          setExportOptions({ history: true, liked: true, artists: true, downloads: true, playlists: true })
          return
        } else {
          // User cancelled
          return
        }
      } catch {
        // Fallback to browser download if Tauri command fails
      }
    }

    // Browser fallback
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultFileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setShowExportModal(false)
    setExportOptions({ history: true, liked: true, artists: true, downloads: true, playlists: true })
  }

  // Handle file selection for import
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.vyra')) {
      alert('Please select a .vyra file')
      return
    }

    setImportFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (!data.version || !data.data) {
          alert('Invalid VYRA backup file')
          return
        }
        setImportedData(data)
        setShowImportModal(true)
      } catch {
        alert('Failed to read backup file')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // Reset input
  }

  // Import data from .vyra file
  const handleImportData = () => {
    if (!importedData?.data) return

    if (importMode === 'fresh') {
      // Fresh start - directly set the imported data (replaces existing)
      if (importOptions.history) {
        usePlayerStore.setState({ 
          recentlyPlayed: importedData.data.recentlyPlayed || [] 
        })
      }
      if (importOptions.liked) {
        usePlayerStore.setState({ 
          likedSongs: importedData.data.likedSongs || [] 
        })
      }
      if (importOptions.artists) {
        useAppStore.setState({ 
          followedArtists: importedData.data.followedArtists || [] 
        })
      }
      if (importOptions.downloads) {
        useAppStore.setState({ 
          downloadedSongs: importedData.data.downloadedSongs || [],
          downloads: []
        })
      }
      if (importOptions.playlists) {
        useAppStore.setState({ 
          userPlaylists: importedData.data.userPlaylists || [],
          selectedUserPlaylist: null
        })
      }
    } else {
      // Merge mode - add new data without removing existing
      const playerStore = usePlayerStore.getState()
      const appStore = useAppStore.getState()

      if (importOptions.history && importedData.data.recentlyPlayed) {
        const existing = new Set(playerStore.recentlyPlayed.map((s: any) => s.id))
        const newSongs = importedData.data.recentlyPlayed.filter((s: any) => !existing.has(s.id))
        usePlayerStore.setState({ recentlyPlayed: [...newSongs, ...playerStore.recentlyPlayed].slice(0, 100) })
      }

      if (importOptions.liked && importedData.data.likedSongs) {
        const existing = new Set(playerStore.likedSongs.map((s: any) => s.id))
        const newSongs = importedData.data.likedSongs.filter((s: any) => !existing.has(s.id))
        usePlayerStore.setState({ likedSongs: [...newSongs, ...playerStore.likedSongs] })
      }

      if (importOptions.artists && importedData.data.followedArtists) {
        const existing = new Set(appStore.followedArtists.map((a: any) => a.id))
        const newArtists = importedData.data.followedArtists.filter((a: any) => !existing.has(a.id))
        useAppStore.setState({ followedArtists: [...appStore.followedArtists, ...newArtists] })
      }

      if (importOptions.downloads && importedData.data.downloadedSongs) {
        const existing = new Set(appStore.downloadedSongs.map((s: any) => s.id))
        const newSongs = importedData.data.downloadedSongs.filter((s: any) => !existing.has(s.id))
        useAppStore.setState({ downloadedSongs: [...appStore.downloadedSongs, ...newSongs] })
      }

      if (importOptions.playlists && importedData.data.userPlaylists) {
        const existing = new Set(appStore.userPlaylists.map((p: any) => p.id))
        const newPlaylists = importedData.data.userPlaylists.filter((p: any) => !existing.has(p.id))
        useAppStore.setState({ userPlaylists: [...appStore.userPlaylists, ...newPlaylists] })
      }
    }

    // Reset and close
    setShowImportModal(false)
    setImportedData(null)
    setImportFileName('')
    setImportOptions({ history: true, liked: true, artists: true, downloads: true, playlists: true })
    setImportMode('merge')
  }

  // Spotify import handler
  const handleSpotifyImport = async () => {
    if (!spotifyUrl.trim()) return

    setSpotifyImportStatus('fetching')
    setSpotifyError(null)
    setSpotifyData(null)
    setSpotifyMatchedSongs([])
    setSpotifyMatchProgress({ current: 0, total: 100, stage: 'Connecting to Spotify...' })

    try {
      // Fetch Spotify playlist/album data with progress callback
      const data = await fetchSpotifyData(spotifyUrl, (stage, progress) => {
        setSpotifyMatchProgress({ current: progress, total: 100, stage })
      })
      
      setSpotifyData(data)
      setSpotifyImportStatus('matching')
      setSpotifyMatchProgress({ current: 0, total: data.tracks.length, stage: 'Matching songs...' })

      // Match each track on YouTube Music
      const matchedSongs: Song[] = []
      const searchFn = async (query: string): Promise<Song[]> => {
        const results = await youtube.searchAll(query)
        return results.songs
      }

      for (let i = 0; i < data.tracks.length; i++) {
        const track = data.tracks[i]
        setSpotifyMatchProgress({ 
          current: i + 1, 
          total: data.tracks.length, 
          stage: `Matching: ${track.name.substring(0, 30)}${track.name.length > 30 ? '...' : ''}`
        })
        
        const matched = await matchSpotifyTrack(track, searchFn)
        if (matched) {
          matchedSongs.push(matched)
        }
        
        // Small delay to avoid rate limiting
        if (i < data.tracks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 150))
        }
      }

      setSpotifyMatchedSongs(matchedSongs)
      setSpotifyImportStatus('done')
    } catch (error) {
      setSpotifyError(error instanceof Error ? error.message : 'Failed to import from Spotify')
      setSpotifyImportStatus('error')
    }
  }

  // Create playlist from matched Spotify songs
  const handleCreateSpotifyPlaylist = () => {
    if (!spotifyData || spotifyMatchedSongs.length === 0) return

    const { createPlaylist, addToPlaylist } = useAppStore.getState()
    const playlistName = `${spotifyData.name} (Spotify Import)`
    const playlistId = createPlaylist(playlistName)

    for (const song of spotifyMatchedSongs) {
      addToPlaylist(playlistId, song)
    }

    // Reset and close
    setShowSpotifyImportModal(false)
    setSpotifyUrl('')
    setSpotifyData(null)
    setSpotifyMatchedSongs([])
    setSpotifyImportStatus('idle')
    setSpotifyError(null)
  }

  // Reset Spotify import modal
  const resetSpotifyImport = () => {
    setSpotifyUrl('')
    setSpotifyData(null)
    setSpotifyMatchedSongs([])
    setSpotifyImportStatus('idle')
    setSpotifyError(null)
    setSpotifyMatchProgress({ current: 0, total: 0, stage: '' })
  }

  // Reset YouTube Music import modal
  const resetYTImport = () => {
    setYtUrl('')
    setYtImportStatus('idle')
    setYtError(null)
    setYtProgress({ current: 0, total: 0, stage: '' })
    setYtPlaylistData(null)
  }

  // Handle YouTube Music import - fetch playlist
  const handleYTImport = async () => {
    if (!ytUrl.trim()) return
    
    setYtImportStatus('fetching')
    setYtError(null)
    setYtProgress({ stage: 'Fetching playlist...', current: 30, total: 100 })
    
    try {
      // Extract playlist ID from URL
      const playlistIdMatch = ytUrl.match(/[?&]list=([^&]+)/) || ytUrl.match(/playlist\/([^?&]+)/)
      if (!playlistIdMatch) {
        throw new Error('Invalid YouTube Music URL. Please use a playlist link.')
      }
      
      const playlistId = playlistIdMatch[1]
      setYtProgress({ stage: 'Loading playlist...', current: 60, total: 100 })
      
      const playlist = await youtube.getPlaylist(playlistId)
      if (!playlist || playlist.songs.length === 0) {
        throw new Error('Playlist not found or empty')
      }
      
      setYtPlaylistData({
        title: playlist.title,
        thumbnail: playlist.thumbnail || '',
        songs: playlist.songs
      })
      setYtImportStatus('done')
    } catch (error) {
      setYtError(error instanceof Error ? error.message : 'Import failed')
      setYtImportStatus('error')
    }
  }

  // Create playlist from YT Music data
  const createYTPlaylist = async () => {
    if (!ytPlaylistData) return
    
    setYtImportStatus('creating')
    
    const newPlaylistName = `${ytPlaylistData.title} (YT Music)`
    const newPlaylistId = createPlaylist(newPlaylistName)
    
    for (let i = 0; i < ytPlaylistData.songs.length; i++) {
      const song = ytPlaylistData.songs[i]
      setYtProgress({ 
        stage: `Adding: ${song.title.substring(0, 30)}${song.title.length > 30 ? '...' : ''}`, 
        current: i + 1, 
        total: ytPlaylistData.songs.length 
      })
      addToPlaylist(newPlaylistId, song)
    }
    
    setYtImportStatus('created')
  }

  const settingGroups = [
    {
      title: 'Appearance',
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: 'Dark Mode',
          description: 'Switch between light and dark themes',
          action: (
            <button
              onClick={toggleDarkMode}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${darkMode ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${darkMode ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: Sun,
          label: 'Accent Color',
          description: accentColor.toUpperCase(),
          action: (
            <div className="relative">
              <button 
                onClick={() => setShowAccentPicker(!showAccentPicker)}
                className="flex items-center gap-2"
              >
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md"
                  style={{ backgroundColor: accentColor }}
                />
              </button>
              {showAccentPicker && (
                <div className={`absolute right-0 top-full mt-2 p-3 rounded-xl shadow-lg z-50
                  ${darkMode ? 'bg-ios-card-dark border border-white/10' : 'bg-white border border-black/10'}`}>
                  {/* Color presets grid - 3x3 */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {accentPresets.map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => {
                          setAccentColor(preset.color)
                        }}
                        className={`w-11 h-11 rounded-full ios-active ios-transition relative
                          ${accentColor.toUpperCase() === preset.color.toUpperCase() ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50' : ''}`}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                      >
                        {accentColor.toUpperCase() === preset.color.toUpperCase() && (
                          <Check size={18} className="absolute inset-0 m-auto text-white drop-shadow-md" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Hex input and color picker */}
                  <div className={`flex items-center gap-2 pt-3 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                    <span className={`text-xs font-medium shrink-0 ${darkMode ? 'text-ios-gray' : 'text-ios-gray'}`}>HEX</span>
                    <input
                      type="text"
                      value={hexInput}
                      onChange={(e) => handleHexChange(e.target.value)}
                      placeholder="#007AFF"
                      maxLength={7}
                      className={`w-24 px-2 py-1.5 rounded-lg text-sm font-mono uppercase
                        ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}
                        focus:outline-none focus:ring-1 focus:ring-ios-blue`}
                    />
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div 
                        className="w-8 h-8 rounded-lg border-2 border-white/20 cursor-pointer"
                        style={{ backgroundColor: accentColor }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }
      ]
    },
    {
      title: 'Playback',
      items: [
        {
          icon: Repeat,
          label: 'Autoplay',
          description: autoplayEnabled ? 'Automatically play next song in queue' : 'Stop after each song',
          action: (
            <button
              onClick={toggleAutoplay}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${autoplayEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${autoplayEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: SlidersHorizontal,
          label: 'Equalizer',
          description: equalizerEnabled ? `${equalizerPreset.charAt(0).toUpperCase() + equalizerPreset.slice(1)} preset active` : 'Adjust audio frequencies',
          action: (
            <button
              onClick={toggleEqualizer}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${equalizerEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${equalizerEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Storage',
      items: [
        {
          icon: HardDrive,
          label: 'Cache Music',
          description: `Cache songs for offline playback (${cachedSongs.length}/${maxCachedSongs})`,
          action: (
            <button
              onClick={toggleCacheEnabled}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${cacheEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${cacheEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: Trash2,
          label: 'Clear Cache',
          description: cachedSongs.length > 0 ? `${cachedSongs.length} songs cached` : 'No songs cached',
          action: (
            <button 
              onClick={handleClearCache}
              disabled={cachedSongs.length === 0}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ios-active
                ${cachedSongs.length > 0 
                  ? 'bg-ios-red text-white' 
                  : darkMode ? 'bg-ios-card-secondary-dark text-ios-gray' : 'bg-ios-card-secondary text-ios-gray'}`}
            >
              Clear
            </button>
          )
        },
        {
          icon: FolderOpen,
          label: 'Download Location',
          description: downloadPath || 'Default: Music/VYRA',
          action: (
            <button 
              onClick={handleSelectFolder}
              className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active"
            >
              Browse
            </button>
          )
        },
        {
          icon: Download,
          label: 'Download Quality',
          description: 'Quality for offline downloads',
          action: (
            <div className="relative">
              <button 
                onClick={() => setShowQualityDropdown(!showQualityDropdown)}
                className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 min-w-[100px] justify-between
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                {currentQuality.label}
                <svg className={`w-4 h-4 ios-transition ${showQualityDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showQualityDropdown && (
                <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg overflow-hidden z-50 min-w-[140px]
                  ${darkMode ? 'bg-ios-card-dark border border-white/10' : 'bg-white border border-black/10'}`}>
                  {qualityOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDownloadQuality(option.value)
                        setShowQualityDropdown(false)
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between
                        ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}
                        ${downloadQuality === option.value ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-ios-gray">{option.description}</p>
                      </div>
                      {downloadQuality === option.value && <Check size={16} className="text-ios-blue" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }
      ]
    },
    {
      title: 'Behavior',
      items: [
        {
          icon: X,
          label: 'Close to Tray',
          description: minimizeToTray ? 'Minimize to system tray on close' : 'Exit app on close',
          action: (
            <button
              onClick={toggleMinimizeToTray}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${minimizeToTray ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${minimizeToTray ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        },
        {
          icon: MessageCircle,
          label: 'Discord Rich Presence',
          description: discordRpcEnabled ? 'Show what you\'re listening to on Discord' : 'Discord status disabled',
          action: (
            <button
              onClick={toggleDiscordRpc}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${discordRpcEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${discordRpcEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Keyboard Shortcuts',
      items: [
        {
          icon: Keyboard,
          label: 'Global Shortcuts',
          description: globalKeybindsEnabled ? 'Work even when app is minimized' : 'Only work when app is focused',
          action: (
            <button
              onClick={toggleGlobalKeybinds}
              className={`relative w-[51px] h-[31px] rounded-full ios-transition
                ${globalKeybindsEnabled ? 'bg-ios-blue' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md ios-transition
                ${globalKeybindsEnabled ? 'left-[22px]' : 'left-[2px]'}`} />
            </button>
          )
        }
      ]
    },
    {
      title: 'Data Management',
      items: [
        {
          icon: Download,
          label: 'Export Data',
          description: 'Save your data to a .vyra file',
          action: (
            <button 
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active"
            >
              Export
            </button>
          )
        },
        {
          icon: Upload,
          label: 'Import Data',
          description: 'Restore data from a .vyra file',
          action: (
            <label className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active cursor-pointer">
              Import
              <input
                type="file"
                accept=".vyra"
                onChange={handleImportFileSelect}
                className="hidden"
              />
            </label>
          )
        },
        {
          icon: Music,
          label: 'Import from Spotify',
          description: 'Import playlists or albums from Spotify URL',
          action: (
            <button 
              onClick={() => {
                resetSpotifyImport()
                setShowSpotifyImportModal(true)
              }}
              className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active"
            >
              Import
            </button>
          )
        },
        {
          icon: Music,
          label: 'Import from YouTube Music',
          description: 'Import playlists from YouTube Music URL',
          action: (
            <button 
              onClick={() => {
                resetYTImport()
                setShowYTImportModal(true)
              }}
              className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active"
            >
              Import
            </button>
          )
        },
        {
          icon: Trash2,
          label: 'Clear Data',
          description: 'Remove history, likes, artists, downloads, or playlists',
          action: (
            <button 
              onClick={() => setShowClearDataModal(true)}
              className="px-3 py-1.5 bg-ios-red text-white rounded-lg text-sm font-medium ios-active"
            >
              Clear
            </button>
          )
        }
      ]
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'Version',
          description: `VYRA v${getCurrentVersion()}`,
          action: null
        },
        {
          icon: RefreshCw,
          label: 'Check for Updates',
          description: checkingUpdate 
            ? 'Checking...' 
            : updateError
              ? updateError
              : updateAvailable 
                ? `Update available: v${updateInfo?.version}` 
                : 'You are on the latest version',
          action: (
            <div className="flex items-center gap-2">
              {updateAvailable && !downloadingUpdate && (
                <>
                  <button 
                    onClick={() => setShowReleaseNotes(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Notes
                  </button>
                  <button 
                    onClick={handleDownloadUpdate}
                    className="px-3 py-1.5 bg-ios-blue text-white rounded-lg text-sm font-medium ios-active flex items-center gap-1"
                  >
                    <ArrowDownCircle size={14} />
                    Update
                  </button>
                </>
              )}
              {downloadingUpdate && (
                <div className="flex items-center gap-2 text-ios-blue">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Downloading...</span>
                </div>
              )}
              {!downloadingUpdate && (
                <button 
                  onClick={checkForUpdates}
                  disabled={checkingUpdate}
                  className={`p-2 rounded-lg ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                >
                  <RefreshCw size={16} className={`${checkingUpdate ? 'animate-spin' : ''} ${darkMode ? 'text-white' : 'text-black'}`} />
                </button>
              )}
            </div>
          )
        },
        {
          icon: Github,
          label: 'Open Source',
          description: 'View on GitHub',
          action: (
            <button 
              onClick={() => openExternalLink('https://github.com/HasibulHasan098/VYRA-MUSIC')}
              className="flex items-center gap-1 text-ios-blue text-sm font-medium ios-active"
            >
              Open <ExternalLink size={13} />
            </button>
          )
        }
      ]
    }
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
        Settings
      </h1>

      {settingGroups.map((group) => (
        <section key={group.title}>
          <h2 className="text-sm font-semibold text-ios-gray uppercase tracking-wider mb-2 px-3">
            {group.title}
          </h2>
          <div className={`rounded-xl ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
            {group.items.map((item, index) => (
              <div key={item.label}>
                <div 
                  className={`flex items-center gap-3 px-4 py-3
                    ${index > 0 ? `border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}` : ''}
                    ${index === 0 ? 'rounded-t-xl' : ''} 
                    ${index === group.items.length - 1 && !(group.title === 'Storage' && item.label === 'Cache Music' && cacheEnabled) ? 'rounded-b-xl' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                    ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                    <item.icon size={18} className="text-ios-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-ios-gray truncate">{item.description}</p>
                  </div>
                  {item.action}
                </div>
                
                {/* Cache Limit Slider - Show right after Cache Music toggle */}
                {group.title === 'Storage' && item.label === 'Cache Music' && cacheEnabled && (
                  <div className={`px-4 pb-4 pt-2 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-ios-gray">Cache Limit</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={maxCachedSongs}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1
                            setMaxCachedSongs(Math.min(999, Math.max(1, val)))
                          }}
                          className={`w-16 px-2 py-1 rounded-lg text-xs text-center font-medium
                            ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}
                            focus:outline-none focus:ring-1 focus:ring-ios-blue`}
                        />
                        <span className="text-xs text-ios-gray">songs</span>
                      </div>
                    </div>
                    <div className="relative h-5 flex items-center">
                      {/* Track background */}
                      <div 
                        className="absolute left-0 right-0 h-1.5 rounded-full"
                        style={{ background: darkMode ? '#3a3a3c' : '#d1d1d6' }}
                      />
                      {/* Filled track */}
                      <div 
                        className="absolute left-0 h-1.5 rounded-full ios-transition"
                        style={{ 
                          width: `${(maxCachedSongs / 999) * 100}%`,
                          background: 'var(--accent-color, #007AFF)'
                        }}
                      />
                      {/* Thumb/Dot */}
                      <div 
                        className="absolute w-4 h-4 rounded-full bg-white shadow-md border border-black/10 ios-transition pointer-events-none"
                        style={{ 
                          left: `calc(${(maxCachedSongs / 999) * 100}% - 8px)`
                        }}
                      />
                      {/* Invisible range input */}
                      <input
                        type="range"
                        min="1"
                        max="999"
                        value={maxCachedSongs}
                        onChange={(e) => setMaxCachedSongs(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-ios-gray">1</span>
                      <span className="text-[10px] text-ios-gray">999</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Equalizer Controls - Show after Playback section when enabled */}
          {group.title === 'Playback' && equalizerEnabled && (
            <div className={`rounded-xl mt-3 ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
              {/* Preset Selector */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`text-sm ${darkMode ? 'text-white' : 'text-black'}`}>Preset</span>
                <div className="relative flex-1 flex justify-end">
                  <button 
                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 min-w-[120px] justify-between
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    {equalizerPreset.charAt(0).toUpperCase() + equalizerPreset.slice(1)}
                    <svg className={`w-4 h-4 ios-transition ${showPresetDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showPresetDropdown && (
                    <div className={`absolute right-0 top-full mt-1 rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px] max-h-[280px] overflow-y-auto
                      ${darkMode ? 'bg-ios-card-dark border border-white/10' : 'bg-white border border-black/10'}`}>
                      {['flat', 'acoustic', 'bass booster', 'bass reducer', 'classical', 'dance', 'deep', 'electronic', 'hiphop', 'jazz', 'latin', 'loudness', 'lounge', 'piano', 'pop', 'rnb', 'rock', 'small speakers', 'spoken word', 'treble booster'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setEqualizerPreset(preset)
                            setShowPresetDropdown(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-sm capitalize
                            ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}
                            ${equalizerPreset === preset ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}
                        >
                          {preset.charAt(0).toUpperCase() + preset.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* EQ Graph */}
              <div className={`px-4 py-4 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-ios-gray">+12dB</span>
                  <span className="text-xs text-ios-gray">-12dB</span>
                </div>
                
                <div className="relative h-36 mb-3">
                  <div className={`absolute left-0 right-0 top-1/2 h-px ${darkMode ? 'bg-white/20' : 'bg-black/20'}`} />
                  
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none" 
                    viewBox="0 0 600 144"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="eqFill" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={accentColor} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 50 ${72 - equalizerBands[0] * 5}
                          C 100 ${72 - equalizerBands[0] * 5}, 100 ${72 - equalizerBands[1] * 5}, 150 ${72 - equalizerBands[1] * 5}
                          C 200 ${72 - equalizerBands[1] * 5}, 200 ${72 - equalizerBands[2] * 5}, 250 ${72 - equalizerBands[2] * 5}
                          C 300 ${72 - equalizerBands[2] * 5}, 300 ${72 - equalizerBands[3] * 5}, 350 ${72 - equalizerBands[3] * 5}
                          C 400 ${72 - equalizerBands[3] * 5}, 400 ${72 - equalizerBands[4] * 5}, 450 ${72 - equalizerBands[4] * 5}
                          C 500 ${72 - equalizerBands[4] * 5}, 500 ${72 - equalizerBands[5] * 5}, 550 ${72 - equalizerBands[5] * 5}
                          L 550 144 L 50 144 Z`}
                      fill="url(#eqFill)"
                    />
                    <path
                      d={`M 50 ${72 - equalizerBands[0] * 5}
                          C 100 ${72 - equalizerBands[0] * 5}, 100 ${72 - equalizerBands[1] * 5}, 150 ${72 - equalizerBands[1] * 5}
                          C 200 ${72 - equalizerBands[1] * 5}, 200 ${72 - equalizerBands[2] * 5}, 250 ${72 - equalizerBands[2] * 5}
                          C 300 ${72 - equalizerBands[2] * 5}, 300 ${72 - equalizerBands[3] * 5}, 350 ${72 - equalizerBands[3] * 5}
                          C 400 ${72 - equalizerBands[3] * 5}, 400 ${72 - equalizerBands[4] * 5}, 450 ${72 - equalizerBands[4] * 5}
                          C 500 ${72 - equalizerBands[4] * 5}, 500 ${72 - equalizerBands[5] * 5}, 550 ${72 - equalizerBands[5] * 5}`}
                      fill="none"
                      stroke={accentColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {equalizerBands.map((value, index) => (
                      <circle
                        key={index}
                        cx={50 + index * 100}
                        cy={72 - value * 5}
                        r="8"
                        fill="white"
                        stroke={accentColor}
                        strokeWidth="3"
                      />
                    ))}
                  </svg>
                  
                  <div className="absolute inset-0 flex">
                    {equalizerBands.map((value, index) => (
                      <div key={index} className="flex-1 flex items-center justify-center">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          value={value}
                          onChange={(e) => setEqualizerBand(index, parseInt(e.target.value))}
                          className="eq-slider"
                          style={{ 
                            writingMode: 'vertical-lr' as const,
                            direction: 'rtl',
                            height: '120px',
                            width: '40px',
                            cursor: 'pointer',
                            opacity: 0,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex">
                  {['60Hz', '150Hz', '400Hz', '1kHz', '2.4kHz', '15kHz'].map((freq) => (
                    <span key={freq} className="flex-1 text-xs text-ios-gray text-center">{freq}</span>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <div className={`flex justify-end px-4 py-3 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                <button
                  onClick={resetEqualizer}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium ios-active
                    ${darkMode ? 'bg-ios-card-secondary-dark text-white hover:bg-white/20' : 'bg-ios-card-secondary text-black hover:bg-black/10'}`}
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Keybind Controls - Show after Keyboard Shortcuts section */}
          {group.title === 'Keyboard Shortcuts' && (
            <div className={`rounded-xl mt-3 overflow-hidden ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
              {/* Tabs */}
              <div className={`flex border-b ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                <button
                  onClick={() => setKeybindTab('inapp')}
                  className={`flex-1 py-3 text-sm font-medium ios-transition
                    ${keybindTab === 'inapp' 
                      ? 'text-ios-blue border-b-2 border-ios-blue' 
                      : darkMode ? 'text-ios-gray' : 'text-ios-gray'}`}
                >
                  In-App
                </button>
                <button
                  onClick={() => setKeybindTab('global')}
                  disabled={!globalKeybindsEnabled}
                  className={`flex-1 py-3 text-sm font-medium ios-transition
                    ${!globalKeybindsEnabled 
                      ? 'text-ios-gray/50 cursor-not-allowed' 
                      : keybindTab === 'global' 
                        ? 'text-ios-blue border-b-2 border-ios-blue' 
                        : darkMode ? 'text-ios-gray' : 'text-ios-gray'}`}
                >
                  Global {!globalKeybindsEnabled && '(Disabled)'}
                </button>
              </div>

              {/* In-App Keybinds */}
              {keybindTab === 'inapp' && (
                <>
                  {Object.entries(inAppKeybinds).map(([action, key], index) => {
                    const labels: Record<string, string> = {
                      playPause: 'Play / Pause',
                      next: 'Next Track',
                      previous: 'Previous Track',
                      volumeUp: 'Volume Up',
                      volumeDown: 'Volume Down',
                      mute: 'Mute',
                      like: 'Like Song',
                      lyrics: 'Toggle Lyrics',
                    }
                    const isEditing = editingKeybind === `inapp-${action}`
                    
                    return (
                      <div
                        key={action}
                        className={`flex items-center justify-between px-4 py-3
                          ${index > 0 ? `border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}` : ''}`}
                      >
                        <span className={`text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                          {labels[action] || action}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingKeybind(isEditing ? null : `inapp-${action}`)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-mono min-w-[80px] text-center ios-active
                              ${isEditing 
                                ? 'bg-ios-blue text-white animate-pulse' 
                                : key 
                                  ? darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'
                                  : 'bg-ios-gray/20 text-ios-gray'}`}
                          >
                            {isEditing ? (currentKeys || 'Press key...') : key || 'None'}
                          </button>
                          {key && (
                            <button
                              onClick={() => setInAppKeybind(action, '')}
                              className="p-1 text-ios-gray hover:text-ios-red ios-active"
                              title="Unbind"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className={`flex justify-end px-4 py-3 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                    <button
                      onClick={resetInAppKeybinds}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium ios-active
                        ${darkMode ? 'bg-ios-card-secondary-dark text-white hover:bg-white/20' : 'bg-ios-card-secondary text-black hover:bg-black/10'}`}
                    >
                      Reset to Default
                    </button>
                  </div>
                </>
              )}

              {/* Global Keybinds */}
              {keybindTab === 'global' && globalKeybindsEnabled && (
                <>
                  <div className={`px-4 py-2 text-xs text-ios-gray ${darkMode ? 'bg-ios-card-secondary-dark/50' : 'bg-ios-card-secondary/50'}`}>
                    Use modifier + key (e.g., Ctrl+P) to avoid conflicts with other apps
                  </div>
                  {Object.entries(globalKeybinds).map(([action, key], index) => {
                    const labels: Record<string, string> = {
                      playPause: 'Play / Pause',
                      next: 'Next Track',
                      previous: 'Previous Track',
                      volumeUp: 'Volume Up',
                      volumeDown: 'Volume Down',
                      mute: 'Mute',
                    }
                    const isEditing = editingKeybind === `global-${action}`
                    
                    return (
                      <div
                        key={action}
                        className={`flex items-center justify-between px-4 py-3
                          ${index > 0 ? `border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}` : 'border-t'} ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}
                      >
                        <span className={`text-sm ${darkMode ? 'text-white' : 'text-black'}`}>
                          {labels[action] || action}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingKeybind(isEditing ? null : `global-${action}`)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-mono min-w-[120px] text-center ios-active
                              ${isEditing 
                                ? 'bg-ios-blue text-white animate-pulse' 
                                : key 
                                  ? darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'
                                  : 'bg-ios-gray/20 text-ios-gray'}`}
                          >
                            {isEditing ? (currentKeys || 'Press combo...') : key || 'None'}
                          </button>
                          {key && (
                            <button
                              onClick={() => setGlobalKeybind(action, '')}
                              className="p-1 text-ios-gray hover:text-ios-red ios-active"
                              title="Unbind"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className={`flex justify-end px-4 py-3 border-t ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
                    <button
                      onClick={resetGlobalKeybinds}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium ios-active
                        ${darkMode ? 'bg-ios-card-secondary-dark text-white hover:bg-white/20' : 'bg-ios-card-secondary text-black hover:bg-black/10'}`}
                    >
                      Reset to Default
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      ))}

      {/* Credits */}
      <section className={`rounded-xl p-5 text-center ${darkMode ? 'bg-ios-card-dark' : 'bg-ios-card'}`}>
        <p className="text-sm text-ios-gray">
          MADE BY FASTHAND
        </p>
      </section>

      {/* Release Notes Modal */}
      {showReleaseNotes && updateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden
            ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                  What's New in v{updateInfo.version}
                </h2>
                <p className="text-xs text-ios-gray mt-0.5">
                  {updateInfo.publishedAt ? new Date(updateInfo.publishedAt).toLocaleDateString() : ''}
                </p>
              </div>
              <button
                onClick={() => setShowReleaseNotes(false)}
                className={`p-2 rounded-full ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={20} className={darkMode ? 'text-white' : 'text-black'} />
              </button>
            </div>
            
            {/* Release Notes Content */}
            <div className={`px-5 py-4 max-h-[300px] overflow-y-auto text-sm leading-relaxed
              ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {updateInfo.body ? (
                <div className="whitespace-pre-wrap">
                  {updateInfo.body.split('\n').map((line, i) => {
                    // Format markdown-style headers
                    if (line.startsWith('## ')) {
                      return <h3 key={i} className={`font-semibold mt-3 mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>{line.replace('## ', '')}</h3>
                    }
                    if (line.startsWith('### ')) {
                      return <h4 key={i} className={`font-medium mt-2 mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>{line.replace('### ', '')}</h4>
                    }
                    // Format bullet points
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return <p key={i} className="ml-2 mb-1">• {line.slice(2)}</p>
                    }
                    // Empty lines
                    if (!line.trim()) {
                      return <br key={i} />
                    }
                    return <p key={i} className="mb-1">{line}</p>
                  })}
                </div>
              ) : (
                <p className="text-ios-gray">No release notes available.</p>
              )}
            </div>
            
            {/* Footer */}
            <div className={`flex gap-3 px-5 py-4 border-t
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <button
                onClick={() => setShowReleaseNotes(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Later
              </button>
              <button
                onClick={() => {
                  setShowReleaseNotes(false)
                  handleDownloadUpdate()
                }}
                className="flex-1 py-2.5 bg-ios-blue text-white rounded-xl text-sm font-medium ios-active flex items-center justify-center gap-2"
              >
                <ArrowDownCircle size={16} />
                Update Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Data Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl overflow-hidden
            ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                Clear Data
              </h2>
              <button
                onClick={() => {
                  setShowClearDataModal(false)
                  setClearDataOptions({ history: false, liked: false, artists: false, downloads: false, playlists: false })
                }}
                className={`p-2 rounded-full ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={20} className={darkMode ? 'text-white' : 'text-black'} />
              </button>
            </div>
            
            {/* Options */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-ios-gray mb-4">Select data to clear:</p>
              
              {/* History */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active
                ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                <div 
                  onClick={() => setClearDataOptions(prev => ({ ...prev, history: !prev.history }))}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${clearDataOptions.history ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {clearDataOptions.history && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>History Data</p>
                  <p className="text-xs text-ios-gray">{recentlyPlayed.length} songs</p>
                </div>
              </label>

              {/* Liked */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active
                ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                <div 
                  onClick={() => setClearDataOptions(prev => ({ ...prev, liked: !prev.liked }))}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${clearDataOptions.liked ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {clearDataOptions.liked && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Liked Data</p>
                  <p className="text-xs text-ios-gray">{likedSongs.length} songs</p>
                </div>
              </label>

              {/* Artists */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active
                ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                <div 
                  onClick={() => setClearDataOptions(prev => ({ ...prev, artists: !prev.artists }))}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${clearDataOptions.artists ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {clearDataOptions.artists && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Artist Data</p>
                  <p className="text-xs text-ios-gray">{followedArtists.length} artists</p>
                </div>
              </label>

              {/* Downloads */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active
                ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                <div 
                  onClick={() => setClearDataOptions(prev => ({ ...prev, downloads: !prev.downloads }))}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${clearDataOptions.downloads ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {clearDataOptions.downloads && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Downloads</p>
                  <p className="text-xs text-ios-gray">{downloadedSongs.length} songs</p>
                </div>
              </label>

              {/* Playlists */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active
                ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                <div 
                  onClick={() => setClearDataOptions(prev => ({ ...prev, playlists: !prev.playlists }))}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${clearDataOptions.playlists ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {clearDataOptions.playlists && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Playlist Data</p>
                  <p className="text-xs text-ios-gray">{userPlaylists.length} playlists</p>
                </div>
              </label>

              {/* Select All */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active border-2 border-dashed
                ${darkMode ? 'border-white/20 hover:bg-white/5' : 'border-black/20 hover:bg-black/5'}`}>
                <div 
                  onClick={() => {
                    const allSelected = Object.values(clearDataOptions).every(v => v)
                    setClearDataOptions({
                      history: !allSelected,
                      liked: !allSelected,
                      artists: !allSelected,
                      downloads: !allSelected,
                      playlists: !allSelected,
                    })
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${Object.values(clearDataOptions).every(v => v) ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {Object.values(clearDataOptions).every(v => v) && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Select All</p>
                </div>
              </label>
            </div>
            
            {/* Footer */}
            <div className={`flex gap-3 px-5 py-4 border-t
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <button
                onClick={() => {
                  setShowClearDataModal(false)
                  setClearDataOptions({ history: false, liked: false, artists: false, downloads: false, playlists: false })
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={!hasSelectedClearOption}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                  ${hasSelectedClearOption 
                    ? 'bg-ios-red text-white' 
                    : 'bg-ios-gray/30 text-ios-gray cursor-not-allowed'}`}
              >
                Clear Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Data Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl overflow-hidden
            ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                Export Data
              </h2>
              <button
                onClick={() => setShowExportModal(false)}
                className={`p-2 rounded-full ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={20} className={darkMode ? 'text-white' : 'text-black'} />
              </button>
            </div>
            
            {/* Options */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-ios-gray mb-4">Select data to export:</p>
              
              {[
                { key: 'history', label: 'History Data', count: `${recentlyPlayed.length} songs` },
                { key: 'liked', label: 'Liked Data', count: `${likedSongs.length} songs` },
                { key: 'artists', label: 'Artist Data', count: `${followedArtists.length} artists` },
                { key: 'downloads', label: 'Downloads', count: `${downloadedSongs.length} songs` },
                { key: 'playlists', label: 'Playlist Data', count: `${userPlaylists.length} playlists` },
              ].map(item => (
                <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                  <div 
                    onClick={() => setExportOptions(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                      ${exportOptions[item.key as keyof typeof exportOptions] ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                  >
                    {exportOptions[item.key as keyof typeof exportOptions] && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>{item.label}</p>
                    <p className="text-xs text-ios-gray">{item.count}</p>
                  </div>
                </label>
              ))}

              {/* Select All */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active border-2 border-dashed
                ${darkMode ? 'border-white/20 hover:bg-white/5' : 'border-black/20 hover:bg-black/5'}`}>
                <div 
                  onClick={() => {
                    const allSelected = Object.values(exportOptions).every(v => v)
                    setExportOptions({
                      history: !allSelected,
                      liked: !allSelected,
                      artists: !allSelected,
                      downloads: !allSelected,
                      playlists: !allSelected,
                    })
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${Object.values(exportOptions).every(v => v) ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {Object.values(exportOptions).every(v => v) && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Select All</p>
                </div>
              </label>
            </div>
            
            {/* Footer */}
            <div className={`flex gap-3 px-5 py-4 border-t
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <button
                onClick={() => setShowExportModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleExportData}
                disabled={!hasSelectedExportOption}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active flex items-center justify-center gap-2
                  ${hasSelectedExportOption 
                    ? 'bg-ios-blue text-white' 
                    : 'bg-ios-gray/30 text-ios-gray cursor-not-allowed'}`}
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Data Modal */}
      {showImportModal && importedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl overflow-hidden
            ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                  Import Data
                </h2>
                <p className="text-xs text-ios-gray">{importFileName}</p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportedData(null)
                  setImportFileName('')
                }}
                className={`p-2 rounded-full ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={20} className={darkMode ? 'text-white' : 'text-black'} />
              </button>
            </div>

            {/* Import Mode Selection */}
            <div className={`px-5 py-3 border-b ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <p className="text-sm text-ios-gray mb-3">How do you want to import?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportMode('merge')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ios-active
                    ${importMode === 'merge' 
                      ? 'bg-ios-blue text-white' 
                      : darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                >
                  Merge
                </button>
                <button
                  onClick={() => setImportMode('fresh')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium ios-active
                    ${importMode === 'fresh' 
                      ? 'bg-ios-blue text-white' 
                      : darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                >
                  Fresh Start
                </button>
              </div>
              <p className="text-xs text-ios-gray mt-2">
                {importMode === 'merge' 
                  ? 'Add imported data to your existing data (duplicates ignored)' 
                  : 'Replace your existing data with imported data'}
              </p>
            </div>
            
            {/* Options */}
            <div className="px-5 py-4 space-y-3 max-h-[300px] overflow-y-auto">
              <p className="text-sm text-ios-gray mb-2">Select data to import:</p>
              
              {[
                { key: 'history', label: 'History Data', data: importedData.data.recentlyPlayed, count: importedData.data.recentlyPlayed?.length || 0 },
                { key: 'liked', label: 'Liked Data', data: importedData.data.likedSongs, count: importedData.data.likedSongs?.length || 0 },
                { key: 'artists', label: 'Artist Data', data: importedData.data.followedArtists, count: importedData.data.followedArtists?.length || 0 },
                { key: 'downloads', label: 'Downloads', data: importedData.data.downloadedSongs, count: importedData.data.downloadedSongs?.length || 0 },
                { key: 'playlists', label: 'Playlist Data', data: importedData.data.userPlaylists, count: importedData.data.userPlaylists?.length || 0 },
              ].map(item => (
                <label 
                  key={item.key} 
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active
                    ${!item.data ? 'opacity-50 cursor-not-allowed' : ''}
                    ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}
                >
                  <div 
                    onClick={() => item.data && setImportOptions(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                      ${!item.data 
                        ? 'border-ios-gray/30 bg-ios-gray/10' 
                        : importOptions[item.key as keyof typeof importOptions] 
                          ? 'bg-ios-blue border-ios-blue' 
                          : darkMode ? 'border-white/30' : 'border-black/30'}`}
                  >
                    {item.data && importOptions[item.key as keyof typeof importOptions] && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>{item.label}</p>
                    <p className="text-xs text-ios-gray">
                      {item.data ? `${item.count} items in backup` : 'Not in backup'}
                    </p>
                  </div>
                </label>
              ))}

              {/* Select All */}
              <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ios-active border-2 border-dashed
                ${darkMode ? 'border-white/20 hover:bg-white/5' : 'border-black/20 hover:bg-black/5'}`}>
                <div 
                  onClick={() => {
                    const allSelected = Object.values(importOptions).every(v => v)
                    setImportOptions({
                      history: !allSelected,
                      liked: !allSelected,
                      artists: !allSelected,
                      downloads: !allSelected,
                      playlists: !allSelected,
                    })
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ios-transition
                    ${Object.values(importOptions).every(v => v) ? 'bg-ios-blue border-ios-blue' : darkMode ? 'border-white/30' : 'border-black/30'}`}
                >
                  {Object.values(importOptions).every(v => v) && <Check size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Select All</p>
                </div>
              </label>
            </div>
            
            {/* Footer */}
            <div className={`flex gap-3 px-5 py-4 border-t
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportedData(null)
                  setImportFileName('')
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                  ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleImportData}
                disabled={!hasSelectedImportOption}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active flex items-center justify-center gap-2
                  ${hasSelectedImportOption 
                    ? 'bg-ios-blue text-white' 
                    : 'bg-ios-gray/30 text-ios-gray cursor-not-allowed'}`}
              >
                <Upload size={16} />
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spotify Import Modal */}
      {showSpotifyImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden
            ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                    Import from Spotify
                  </h2>
                  <p className="text-xs text-ios-gray">Paste a playlist or album URL</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSpotifyImportModal(false)
                  resetSpotifyImport()
                }}
                className={`p-2 rounded-full ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={20} className={darkMode ? 'text-white' : 'text-black'} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              {spotifyImportStatus === 'idle' && (
                <>
                  <input
                    type="text"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/..."
                    className={`w-full px-4 py-3 rounded-xl text-sm
                      ${darkMode 
                        ? 'bg-ios-card-secondary-dark text-white placeholder-ios-gray' 
                        : 'bg-ios-card-secondary text-black placeholder-ios-gray'}
                      focus:outline-none focus:ring-2 focus:ring-[#1DB954]`}
                  />
                  <p className="text-xs text-ios-gray mt-2">
                    Supports public playlists, albums, and single tracks
                  </p>
                </>
              )}

              {spotifyImportStatus === 'fetching' && (
                <div className="flex flex-col items-center py-6">
                  <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                    {spotifyMatchProgress.stage || 'Fetching Spotify data...'}
                  </p>
                  <div className="w-full h-2 rounded-full bg-ios-gray/20 overflow-hidden">
                    <div 
                      className="h-full bg-[#1DB954] transition-all duration-500 ease-out"
                      style={{ width: `${spotifyMatchProgress.current}%` }}
                    />
                  </div>
                  <p className="text-xs text-ios-gray mt-2">
                    Please wait...
                  </p>
                </div>
              )}

              {spotifyImportStatus === 'matching' && (
                <div className="flex flex-col items-center py-6">
                  <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>
                    Matching songs on YouTube Music
                  </p>
                  <p className="text-xs text-ios-gray mb-3 text-center truncate max-w-full px-2">
                    {spotifyMatchProgress.stage}
                  </p>
                  <div className="w-full h-2 rounded-full bg-ios-gray/20 overflow-hidden">
                    <div 
                      className="h-full bg-[#1DB954] transition-all duration-300"
                      style={{ width: `${(spotifyMatchProgress.current / spotifyMatchProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-ios-gray mt-2">
                    {spotifyMatchProgress.current} / {spotifyMatchProgress.total} tracks
                  </p>
                </div>
              )}

              {spotifyImportStatus === 'done' && spotifyData && (
                <div className="space-y-4">
                  {/* Playlist info */}
                  <div className="flex items-center gap-3">
                    {spotifyData.thumbnail && (
                      <img 
                        src={spotifyData.thumbnail} 
                        alt={spotifyData.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                        {spotifyData.name}
                      </p>
                      <p className="text-xs text-ios-gray">
                        {spotifyData.tracks.length} tracks from Spotify
                      </p>
                    </div>
                  </div>

                  {/* Match results */}
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-ios-gray">Matched</span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                        {spotifyMatchedSongs.length} / {spotifyData.tracks.length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ios-gray/20 overflow-hidden">
                      <div 
                        className="h-full bg-[#1DB954]"
                        style={{ width: `${(spotifyMatchedSongs.length / spotifyData.tracks.length) * 100}%` }}
                      />
                    </div>
                    {spotifyMatchedSongs.length < spotifyData.tracks.length && (
                      <p className="text-xs text-ios-gray mt-2">
                        {spotifyData.tracks.length - spotifyMatchedSongs.length} tracks couldn't be found on YouTube Music
                      </p>
                    )}
                  </div>

                  {/* Preview matched songs */}
                  {spotifyMatchedSongs.length > 0 && (
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {spotifyMatchedSongs.slice(0, 5).map((song, i) => (
                        <div key={song.id} className="flex items-center gap-2">
                          <img 
                            src={song.thumbnail} 
                            alt={song.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                              {song.title}
                            </p>
                            <p className="text-xs text-ios-gray truncate">
                              {song.artists.map(a => a.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                      {spotifyMatchedSongs.length > 5 && (
                        <p className="text-xs text-ios-gray text-center py-2">
                          +{spotifyMatchedSongs.length - 5} more songs
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {spotifyImportStatus === 'error' && (
                <div className="flex flex-col items-center py-6">
                  <div className="w-12 h-12 rounded-full bg-ios-red/20 flex items-center justify-center mb-3">
                    <AlertCircle size={24} className="text-ios-red" />
                  </div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    Import Failed
                  </p>
                  <p className="text-xs text-ios-gray mt-1 text-center">
                    {spotifyError}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex gap-3 px-5 py-4 border-t
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              {spotifyImportStatus === 'idle' && (
                <>
                  <button
                    onClick={() => {
                      setShowSpotifyImportModal(false)
                      resetSpotifyImport()
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSpotifyImport}
                    disabled={!spotifyUrl.trim()}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${spotifyUrl.trim() 
                        ? 'bg-[#1DB954] text-white' 
                        : 'bg-ios-gray/30 text-ios-gray cursor-not-allowed'}`}
                  >
                    Fetch Playlist
                  </button>
                </>
              )}

              {spotifyImportStatus === 'done' && (
                <>
                  <button
                    onClick={resetSpotifyImport}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Import Another
                  </button>
                  <button
                    onClick={handleCreateSpotifyPlaylist}
                    disabled={spotifyMatchedSongs.length === 0}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active flex items-center justify-center gap-2
                      ${spotifyMatchedSongs.length > 0 
                        ? 'bg-[#1DB954] text-white' 
                        : 'bg-ios-gray/30 text-ios-gray cursor-not-allowed'}`}
                  >
                    <Check size={16} />
                    Create Playlist
                  </button>
                </>
              )}

              {spotifyImportStatus === 'error' && (
                <>
                  <button
                    onClick={() => {
                      setShowSpotifyImportModal(false)
                      resetSpotifyImport()
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Close
                  </button>
                  <button
                    onClick={resetSpotifyImport}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium ios-active bg-[#1DB954] text-white"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* YouTube Music Import Modal */}
      {showYTImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden
            ${darkMode ? 'bg-ios-card-dark' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FF0000] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                    Import from YouTube Music
                  </h2>
                  <p className="text-xs text-ios-gray">Paste a playlist URL</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowYTImportModal(false)
                  resetYTImport()
                }}
                className={`p-2 rounded-full ios-active ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              >
                <X size={20} className="text-ios-gray" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {ytImportStatus === 'idle' && (
                <>
                  <input
                    type="text"
                    placeholder="https://music.youtube.com/playlist?list=..."
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl text-sm outline-none
                      ${darkMode 
                        ? 'bg-ios-card-secondary-dark text-white placeholder-ios-gray' 
                        : 'bg-ios-card-secondary text-black placeholder-ios-gray'}
                      focus:outline-none focus:ring-2 focus:ring-[#FF0000]`}
                  />
                  <p className="text-xs text-ios-gray">
                    Supports public YouTube Music playlists
                  </p>
                </>
              )}

              {ytImportStatus === 'fetching' && (
                <div className="flex flex-col items-center py-6">
                  <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                    {ytProgress.stage || 'Fetching playlist...'}
                  </p>
                  <div className="w-full h-2 rounded-full bg-ios-gray/20 overflow-hidden">
                    <div 
                      className="h-full bg-[#FF0000] transition-all duration-500 ease-out"
                      style={{ width: `${ytProgress.current}%` }}
                    />
                  </div>
                  <p className="text-xs text-ios-gray mt-2">
                    Please wait...
                  </p>
                </div>
              )}

              {ytImportStatus === 'done' && ytPlaylistData && (
                <div className="space-y-4">
                  {/* Playlist info */}
                  <div className="flex items-center gap-3">
                    {ytPlaylistData.thumbnail && (
                      <img 
                        src={ytPlaylistData.thumbnail} 
                        alt={ytPlaylistData.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                        {ytPlaylistData.title}
                      </p>
                      <p className="text-xs text-ios-gray">
                        {ytPlaylistData.songs.length} tracks from YouTube Music
                      </p>
                    </div>
                  </div>

                  {/* Track count */}
                  <div className={`p-3 rounded-xl ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-ios-gray">Tracks</span>
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                        {ytPlaylistData.songs.length} / {ytPlaylistData.songs.length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ios-gray/20 overflow-hidden">
                      <div className="h-full bg-[#FF0000] w-full" />
                    </div>
                  </div>

                  {/* Preview songs */}
                  {ytPlaylistData.songs.length > 0 && (
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                      {ytPlaylistData.songs.slice(0, 5).map((song) => (
                        <div key={song.id} className="flex items-center gap-2">
                          <img 
                            src={song.thumbnail || `https://img.youtube.com/vi/${song.id}/hqdefault.jpg`} 
                            alt={song.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                              {song.title}
                            </p>
                            <p className="text-xs text-ios-gray truncate">
                              {song.artists.map(a => a.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                      {ytPlaylistData.songs.length > 5 && (
                        <p className="text-xs text-ios-gray text-center pt-2">
                          +{ytPlaylistData.songs.length - 5} more tracks
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {ytImportStatus === 'creating' && (
                <div className="flex flex-col items-center py-6">
                  <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-white' : 'text-black'}`}>
                    Creating playlist
                  </p>
                  <p className="text-xs text-ios-gray mb-3 text-center truncate max-w-full px-2">
                    {ytProgress.stage}
                  </p>
                  <div className="w-full h-2 rounded-full bg-ios-gray/20 overflow-hidden">
                    <div 
                      className="h-full bg-[#FF0000] transition-all duration-300"
                      style={{ width: `${(ytProgress.current / ytProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-ios-gray mt-2">
                    {ytProgress.current} / {ytProgress.total} tracks
                  </p>
                </div>
              )}

              {ytImportStatus === 'created' && (
                <div className="py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-ios-green/20 flex items-center justify-center mx-auto mb-3">
                    <Check size={32} className="text-ios-green" />
                  </div>
                  <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                    Playlist Created!
                  </p>
                  <p className="text-sm text-ios-gray mt-1">
                    {ytPlaylistData?.songs.length} songs added to your library
                  </p>
                </div>
              )}

              {ytImportStatus === 'error' && (
                <div className="py-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-ios-red/20 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle size={32} className="text-ios-red" />
                  </div>
                  <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                    Import Failed
                  </p>
                  <p className="text-sm text-ios-red mt-1">
                    {ytError}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex gap-3 px-5 py-4 border-t
              ${darkMode ? 'border-ios-separator-dark' : 'border-ios-separator'}`}>
              {ytImportStatus === 'idle' && (
                <>
                  <button
                    onClick={() => {
                      setShowYTImportModal(false)
                      resetYTImport()
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleYTImport}
                    disabled={!ytUrl.trim()}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${ytUrl.trim() 
                        ? 'bg-[#FF0000] text-white' 
                        : 'bg-ios-gray/30 text-ios-gray cursor-not-allowed'}`}
                  >
                    Import
                  </button>
                </>
              )}

              {ytImportStatus === 'fetching' && (
                <button
                  disabled
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-ios-gray/30 text-ios-gray cursor-not-allowed"
                >
                  Loading...
                </button>
              )}

              {ytImportStatus === 'done' && (
                <>
                  <button
                    onClick={resetYTImport}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Import Another
                  </button>
                  <button
                    onClick={createYTPlaylist}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium ios-active bg-[#FF0000] text-white flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Create Playlist
                  </button>
                </>
              )}

              {ytImportStatus === 'creating' && (
                <button
                  disabled
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-ios-gray/30 text-ios-gray cursor-not-allowed"
                >
                  Creating...
                </button>
              )}

              {ytImportStatus === 'created' && (
                <>
                  <button
                    onClick={resetYTImport}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Import Another
                  </button>
                  <button
                    onClick={() => {
                      setShowYTImportModal(false)
                      resetYTImport()
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium ios-active bg-[#FF0000] text-white"
                  >
                    Done
                  </button>
                </>
              )}

              {ytImportStatus === 'error' && (
                <>
                  <button
                    onClick={() => {
                      setShowYTImportModal(false)
                      resetYTImport()
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium ios-active
                      ${darkMode ? 'bg-ios-card-secondary-dark text-white' : 'bg-ios-card-secondary text-black'}`}
                  >
                    Close
                  </button>
                  <button
                    onClick={resetYTImport}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium ios-active bg-[#FF0000] text-white"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
