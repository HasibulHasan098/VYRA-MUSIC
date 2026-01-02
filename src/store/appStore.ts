import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ArtistPage, HomeSection, PlaylistPage, SearchResult, Song, youtube } from '../api/youtube'

type View = 'home' | 'explore' | 'library' | 'search' | 'settings' | 'queue' | 'artist' | 'playlist'
type LibraryTab = 'recent' | 'liked' | 'playlists' | 'downloads'
type DownloadQuality = 'normal' | 'high' | 'very_high'

interface DownloadProgress {
  trackId: string
  track: Song
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'error'
  error?: string
}

interface UserPlaylist {
  id: string
  name: string
  songs: Song[]
  createdAt: number
}

interface ViewHistoryEntry {
  view: View
  searchQuery?: string
  searchResults?: SearchResult | null
}

interface AppState {
  currentView: View
  viewHistory: ViewHistoryEntry[]
  darkMode: boolean
  sidebarCollapsed: boolean
  nowPlayingCollapsed: boolean
  showLyrics: boolean
  libraryTab: LibraryTab
  searchQuery: string
  searchSuggestions: string[]
  searchResults: SearchResult | null
  homeSections: HomeSection[]
  isLoadingHome: boolean
  isLoadingSearch: boolean
  currentArtist: ArtistPage | null
  isLoadingArtist: boolean
  currentPlaylist: PlaylistPage | null
  isLoadingPlaylist: boolean
  recommendations: Song[]
  isLoadingRecommendations: boolean
  downloadPath: string
  downloadQuality: DownloadQuality
  downloads: DownloadProgress[]
  downloadedSongs: Song[]
  // Caching settings
  cacheEnabled: boolean
  cachedSongs: Song[]
  maxCachedSongs: number
  // App behavior
  minimizeToTray: boolean
  discordRpcEnabled: boolean
  autoplayEnabled: boolean
  // Equalizer
  equalizerEnabled: boolean
  equalizerPreset: string
  equalizerBands: number[]
  // Accent color
  accentColor: string
  // Keybinds
  globalKeybindsEnabled: boolean
  inAppKeybinds: {
    playPause: string
    next: string
    previous: string
    volumeUp: string
    volumeDown: string
    mute: string
    like: string
    lyrics: string
  }
  globalKeybinds: {
    playPause: string
    next: string
    previous: string
    volumeUp: string
    volumeDown: string
    mute: string
  }
  // User playlists
  userPlaylists: UserPlaylist[]
  selectedUserPlaylist: UserPlaylist | null
  
  setView: (view: View) => void
  setLibraryTab: (tab: LibraryTab) => void
  goBack: () => void
  toggleDarkMode: () => void
  toggleSidebar: () => void
  toggleNowPlaying: () => void
  toggleLyrics: () => void
  closeLyrics: () => void
  setSearchQuery: (query: string) => void
  fetchSearchSuggestions: (query: string) => Promise<void>
  performSearch: (query: string) => Promise<void>
  fetchHome: () => Promise<void>
  fetchRecommendations: (videoIds: string[]) => Promise<void>
  openArtist: (artistId: string) => Promise<void>
  openPlaylist: (playlistId: string) => Promise<void>
  openAlbum: (albumId: string) => Promise<void>
  setDownloadPath: (path: string) => void
  setDownloadQuality: (quality: DownloadQuality) => void
  downloadTrack: (track: Song) => Promise<void>
  removeDownload: (trackId: string) => void
  removeDownloadedSong: (trackId: string) => void
  isDownloaded: (trackId: string) => boolean
  toggleMinimizeToTray: () => void
  toggleDiscordRpc: () => void
  toggleAutoplay: () => void
  // Equalizer functions
  toggleEqualizer: () => void
  setEqualizerPreset: (preset: string) => void
  setEqualizerBand: (index: number, value: number) => void
  resetEqualizer: () => void
  // Accent color
  setAccentColor: (color: string) => void
  // Keybinds
  toggleGlobalKeybinds: () => void
  setInAppKeybind: (action: string, key: string) => void
  setGlobalKeybind: (action: string, key: string) => void
  resetInAppKeybinds: () => void
  resetGlobalKeybinds: () => void
  // Caching functions
  toggleCacheEnabled: () => void
  addToCache: (track: Song) => void
  removeFromCache: (trackId: string) => void
  clearCache: () => void
  isCached: (trackId: string) => boolean
  // Playlist functions
  createPlaylist: (name: string) => string
  deletePlaylist: (playlistId: string) => void
  renamePlaylist: (playlistId: string, newName: string) => void
  addToPlaylist: (playlistId: string, track: Song) => void
  removeFromPlaylist: (playlistId: string, trackId: string) => void
  openUserPlaylist: (playlistId: string) => void
  isInPlaylist: (playlistId: string, trackId: string) => boolean
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: 'home',
      viewHistory: [],
      darkMode: true,
      sidebarCollapsed: false,
      nowPlayingCollapsed: false,
      showLyrics: false,
      libraryTab: 'liked',
      searchQuery: '',
      searchSuggestions: [],
      searchResults: null,
      homeSections: [],
      isLoadingHome: false,
      isLoadingSearch: false,
      currentArtist: null,
      isLoadingArtist: false,
      currentPlaylist: null,
      isLoadingPlaylist: false,
      recommendations: [],
      isLoadingRecommendations: false,
      downloadPath: '',
      downloadQuality: 'high',
      downloads: [],
      downloadedSongs: [],
      // Caching
      cacheEnabled: true,
      cachedSongs: [],
      maxCachedSongs: 40,
      // App behavior
      minimizeToTray: true,
      discordRpcEnabled: true,
      autoplayEnabled: true,
      // Equalizer
      equalizerEnabled: false,
      equalizerPreset: 'flat',
      equalizerBands: [0, 0, 0, 0, 0, 0], // 60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 15kHz
      // Accent color
      accentColor: '#007AFF', // iOS blue default
      // Keybinds
      globalKeybindsEnabled: false,
      inAppKeybinds: {
        playPause: 'Space',
        next: 'ArrowRight',
        previous: 'ArrowLeft',
        volumeUp: 'ArrowUp',
        volumeDown: 'ArrowDown',
        mute: 'M',
        like: 'L',
        lyrics: 'K',
      },
      globalKeybinds: {
        playPause: 'Ctrl+Space',
        next: 'Ctrl+Right',
        previous: 'Ctrl+Left',
        volumeUp: 'Ctrl+Up',
        volumeDown: 'Ctrl+Down',
        mute: 'Ctrl+M',
      },
      // User playlists
      userPlaylists: [],
      selectedUserPlaylist: null,

      setView: (view) => {
        const { currentView, viewHistory, searchQuery, searchResults } = get()
        // Always close lyrics when navigating
        set({ showLyrics: false })
        // Don't add to history if navigating to same view
        if (view !== currentView) {
          set({ 
            currentView: view,
            searchQuery: '',  // Clear search when navigating via sidebar
            viewHistory: [...viewHistory, { view: currentView, searchQuery, searchResults }]
          })
        } else {
          // Same view clicked - just clear search
          set({ searchQuery: '' })
        }
      },

      setLibraryTab: (tab) => {
        const { currentView, viewHistory, searchQuery, searchResults } = get()
        // Always close lyrics when navigating
        set({ showLyrics: false })
        if (currentView !== 'library') {
          set({ 
            currentView: 'library',
            libraryTab: tab,
            searchQuery: '',
            viewHistory: [...viewHistory, { view: currentView, searchQuery, searchResults }]
          })
        } else {
          set({ libraryTab: tab })
        }
      },

      goBack: () => {
        const { viewHistory } = get()
        if (viewHistory.length === 0) {
          set({ currentView: 'home', searchQuery: '' })
          return
        }
        const newHistory = [...viewHistory]
        const lastEntry = newHistory.pop()!
        set({ 
          currentView: lastEntry.view,
          searchQuery: lastEntry.searchQuery || '',
          searchResults: lastEntry.searchResults !== undefined ? lastEntry.searchResults : get().searchResults,
          viewHistory: newHistory
        })
      },
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleNowPlaying: () => set((state) => ({ nowPlayingCollapsed: !state.nowPlayingCollapsed })),
      toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
      closeLyrics: () => set({ showLyrics: false }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      fetchSearchSuggestions: async (query) => {
        if (!query.trim()) {
          set({ searchSuggestions: [] })
          return
        }
        try {
          const suggestions = await youtube.getSearchSuggestions(query)
          set({ searchSuggestions: suggestions })
        } catch {
          set({ searchSuggestions: [] })
        }
      },

      performSearch: async (query) => {
        if (!query.trim()) return
        set({ isLoadingSearch: true, searchQuery: query })
        try {
          const results = await youtube.searchAll(query)
          set({ searchResults: results, isLoadingSearch: false })
        } catch {
          set({ searchResults: null, isLoadingSearch: false })
        }
      },

      fetchHome: async () => {
        set({ isLoadingHome: true })
        try {
          const sections = await youtube.getHome()
          set({ homeSections: sections, isLoadingHome: false })
        } catch {
          set({ homeSections: [], isLoadingHome: false })
        }
      },

      fetchRecommendations: async (videoIds: string[]) => {
        if (videoIds.length === 0) {
          set({ recommendations: [] })
          return
        }
        set({ isLoadingRecommendations: true })
        try {
          // Get recommendations from YouTube's radio feature
          const songs = await youtube.getRecommendations(videoIds)
          
          // Also analyze user's listening history to get favorite artists
          const { usePlayerStore } = await import('./playerStore')
          const { recentlyPlayed, likedSongs } = usePlayerStore.getState()
          
          // Count artist occurrences in history
          const artistCounts: Record<string, { name: string; count: number }> = {}
          const allSongs = [...recentlyPlayed, ...likedSongs]
          
          for (const song of allSongs) {
            for (const artist of song.artists) {
              if (artist.name && artist.name !== 'Unknown Artist') {
                const key = artist.name.toLowerCase()
                if (!artistCounts[key]) {
                  artistCounts[key] = { name: artist.name, count: 0 }
                }
                artistCounts[key].count++
              }
            }
          }
          
          // Get top 3 favorite artists
          const topArtists = Object.values(artistCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(a => a.name)
          
          // Search for more songs from favorite artists
          let artistSongs: typeof songs = []
          if (topArtists.length > 0) {
            try {
              const artistSearches = await Promise.allSettled(
                topArtists.map(artist => youtube.searchAll(`${artist} songs`))
              )
              
              for (const result of artistSearches) {
                if (result.status === 'fulfilled' && result.value.songs.length > 0) {
                  // Filter out songs already in recommendations or history
                  const existingIds = new Set([
                    ...songs.map(s => s.id),
                    ...recentlyPlayed.map(s => s.id),
                    ...likedSongs.map(s => s.id)
                  ])
                  const newSongs = result.value.songs.filter(s => !existingIds.has(s.id))
                  artistSongs.push(...newSongs.slice(0, 5))
                }
              }
            } catch {
              // Silently fail artist search
            }
          }
          
          // Combine and shuffle recommendations
          const combined = [...songs, ...artistSongs]
          const shuffled = combined.sort(() => Math.random() - 0.5)
          
          set({ recommendations: shuffled.slice(0, 20), isLoadingRecommendations: false })
        } catch {
          set({ recommendations: [], isLoadingRecommendations: false })
        }
      },

      openArtist: async (artistId: string) => {
        const { currentView, viewHistory, searchQuery, searchResults } = get()
        set({ 
          isLoadingArtist: true, 
          currentView: 'artist', 
          searchQuery: '',
          viewHistory: [...viewHistory, { view: currentView, searchQuery, searchResults }]
        })
        try {
          const artist = await youtube.getArtist(artistId)
          set({ currentArtist: artist, isLoadingArtist: false })
        } catch {
          set({ currentArtist: null, isLoadingArtist: false })
        }
      },

      openPlaylist: async (playlistId: string) => {
        const { currentView, viewHistory, searchQuery, searchResults } = get()
        set({ 
          isLoadingPlaylist: true, 
          currentView: 'playlist', 
          searchQuery: '',
          viewHistory: [...viewHistory, { view: currentView, searchQuery, searchResults }]
        })
        try {
          const playlist = await youtube.getPlaylist(playlistId)
          set({ currentPlaylist: playlist, isLoadingPlaylist: false })
        } catch {
          set({ currentPlaylist: null, isLoadingPlaylist: false })
        }
      },

      openAlbum: async (albumId: string) => {
        const { currentView, viewHistory, searchQuery, searchResults } = get()
        set({ 
          isLoadingPlaylist: true, 
          currentView: 'playlist', 
          searchQuery: '',
          viewHistory: [...viewHistory, { view: currentView, searchQuery, searchResults }]
        })
        try {
          const album = await youtube.getAlbum(albumId)
          set({ currentPlaylist: album, isLoadingPlaylist: false })
        } catch {
          set({ currentPlaylist: null, isLoadingPlaylist: false })
        }
      },

      setDownloadPath: (path) => set({ downloadPath: path }),
      
      setDownloadQuality: (quality) => set({ downloadQuality: quality }),

      downloadTrack: async (track: Song) => {
        const { downloads, downloadedSongs, downloadPath, downloadQuality } = get()
        
        // Check if already downloading or downloaded
        if (downloads.some(d => d.trackId === track.id && d.status === 'downloading')) {
          return
        }
        if (downloadedSongs.some(s => s.id === track.id)) {
          return
        }

        // Add to downloads list with the track info stored
        const newDownload = { trackId: track.id, track, progress: 0, status: 'downloading' as const }
        set({ 
          downloads: [...downloads, newDownload]
        })

        try {
          // Check if running in Tauri
          if (typeof window !== 'undefined' && window.__TAURI__) {
            const { invoke } = await import('@tauri-apps/api/core')
            
            await invoke('download_track', {
              videoId: track.id,
              title: track.title,
              artist: track.artists.map(a => a.name).join(', '),
              downloadPath: downloadPath || null,
              quality: downloadQuality
            })

            // Update status to completed
            set({
              downloads: get().downloads.map(d => 
                d.trackId === track.id ? { ...d, progress: 100, status: 'completed' as const } : d
              ),
              downloadedSongs: [...get().downloadedSongs, track]
            })
          } else {
            throw new Error('Downloads require the desktop app')
          }
        } catch (error) {
          set({
            downloads: get().downloads.map(d => 
              d.trackId === track.id 
                ? { ...d, status: 'error' as const, error: error instanceof Error ? error.message : 'Download failed' } 
                : d
            )
          })
        }
      },

      removeDownload: (trackId) => {
        set({
          downloads: get().downloads.filter(d => d.trackId !== trackId)
        })
      },

      removeDownloadedSong: (trackId) => {
        set({
          downloads: get().downloads.filter(d => d.trackId !== trackId),
          downloadedSongs: get().downloadedSongs.filter(s => s.id !== trackId)
        })
      },

      isDownloaded: (trackId) => {
        return get().downloadedSongs.some(s => s.id === trackId)
      },

      // Caching functions
      toggleCacheEnabled: () => set((state) => ({ cacheEnabled: !state.cacheEnabled })),

      addToCache: (track) => {
        const { cachedSongs, maxCachedSongs, cacheEnabled } = get()
        if (!cacheEnabled) return
        
        // Don't add if already cached
        if (cachedSongs.some(s => s.id === track.id)) return
        
        // Add to cache, remove oldest if at limit
        let newCache = [...cachedSongs, track]
        if (newCache.length > maxCachedSongs) {
          newCache = newCache.slice(-maxCachedSongs)
        }
        set({ cachedSongs: newCache })
      },

      removeFromCache: (trackId) => {
        set({ cachedSongs: get().cachedSongs.filter(s => s.id !== trackId) })
      },

      clearCache: () => set({ cachedSongs: [] }),

      isCached: (trackId) => {
        return get().cachedSongs.some(s => s.id === trackId)
      },

      toggleMinimizeToTray: () => set((state) => ({ minimizeToTray: !state.minimizeToTray })),

      toggleDiscordRpc: () => {
        const newValue = !get().discordRpcEnabled
        set({ discordRpcEnabled: newValue })
        // Clear Discord presence if disabled
        if (!newValue && typeof window !== 'undefined' && window.__TAURI__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('clear_discord_presence').catch(() => {})
          })
        }
      },

      toggleAutoplay: () => set((state) => ({ autoplayEnabled: !state.autoplayEnabled })),

      // Equalizer functions
      toggleEqualizer: () => {
        set((state) => ({ equalizerEnabled: !state.equalizerEnabled }))
        // Update audio filters
        import('./playerStore').then(({ usePlayerStore }) => {
          usePlayerStore.getState().updateEqualizer()
        })
      },
      
      setEqualizerPreset: (preset) => {
        const presets: Record<string, number[]> = {
          flat: [0, 0, 0, 0, 0, 0],
          acoustic: [4, 3, 1, 1, 3, 2],
          'bass booster': [6, 5, 3, 0, 0, 0],
          'bass reducer': [-6, -4, -2, 0, 0, 0],
          classical: [4, 3, 0, 0, 2, 3],
          dance: [4, 6, 4, 0, 2, 4],
          deep: [5, 4, 2, 1, 2, 3],
          electronic: [5, 4, 0, -2, 2, 5],
          hiphop: [5, 4, 1, 3, -1, 2],
          jazz: [3, 2, 1, 2, 3, 4],
          latin: [3, 2, 0, 0, 2, 4],
          loudness: [5, 3, 0, 0, 3, 5],
          lounge: [2, 1, 0, -1, 1, 2],
          piano: [2, 1, 0, 2, 3, 2],
          pop: [-1, 2, 4, 3, 1, -1],
          rnb: [3, 6, 4, 1, 3, 2],
          rock: [5, 3, -1, 1, 3, 5],
          'small speakers': [-2, 1, 3, 3, 2, 1],
          'spoken word': [-1, 0, 1, 3, 2, 0],
          'treble booster': [0, 0, 0, 2, 4, 6],
        }
        set({ 
          equalizerPreset: preset, 
          equalizerBands: presets[preset] || presets.flat 
        })
        // Update audio filters
        import('./playerStore').then(({ usePlayerStore }) => {
          usePlayerStore.getState().updateEqualizer()
        })
      },
      
      setEqualizerBand: (index, value) => {
        const bands = [...get().equalizerBands]
        bands[index] = value
        set({ equalizerBands: bands, equalizerPreset: 'custom' })
        // Update audio filters
        import('./playerStore').then(({ usePlayerStore }) => {
          usePlayerStore.getState().updateEqualizer()
        })
      },
      
      resetEqualizer: () => {
        set({ 
          equalizerBands: [0, 0, 0, 0, 0, 0], 
          equalizerPreset: 'flat' 
        })
        // Update audio filters
        import('./playerStore').then(({ usePlayerStore }) => {
          usePlayerStore.getState().updateEqualizer()
        })
      },

      // Accent color
      setAccentColor: (color) => {
        set({ accentColor: color })
        // Update CSS variable
        document.documentElement.style.setProperty('--accent-color', color)
      },

      // Keybinds
      toggleGlobalKeybinds: () => {
        const newValue = !get().globalKeybindsEnabled
        set({ globalKeybindsEnabled: newValue })
        // Register/unregister global shortcuts with Tauri
        if (typeof window !== 'undefined' && window.__TAURI__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_global_shortcuts', { enabled: newValue, shortcuts: get().globalKeybinds }).catch(() => {})
          })
        }
      },

      setInAppKeybind: (action, key) => {
        set({
          inAppKeybinds: {
            ...get().inAppKeybinds,
            [action]: key
          }
        })
      },

      setGlobalKeybind: (action, key) => {
        const newKeybinds = {
          ...get().globalKeybinds,
          [action]: key
        }
        set({ globalKeybinds: newKeybinds })
        // Update global shortcuts if enabled
        if (get().globalKeybindsEnabled && typeof window !== 'undefined' && window.__TAURI__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_global_shortcuts', { enabled: true, shortcuts: newKeybinds }).catch(() => {})
          })
        }
      },

      resetInAppKeybinds: () => {
        set({
          inAppKeybinds: {
            playPause: 'Space',
            next: 'ArrowRight',
            previous: 'ArrowLeft',
            volumeUp: 'ArrowUp',
            volumeDown: 'ArrowDown',
            mute: 'M',
            like: 'L',
            lyrics: 'K',
          }
        })
      },

      resetGlobalKeybinds: () => {
        const defaultKeybinds = {
          playPause: 'Ctrl+Space',
          next: 'Ctrl+Right',
          previous: 'Ctrl+Left',
          volumeUp: 'Ctrl+Up',
          volumeDown: 'Ctrl+Down',
          mute: 'Ctrl+M',
        }
        set({ globalKeybinds: defaultKeybinds })
        // Update global shortcuts if enabled
        if (get().globalKeybindsEnabled && typeof window !== 'undefined' && window.__TAURI__) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_global_shortcuts', { enabled: true, shortcuts: defaultKeybinds }).catch(() => {})
          })
        }
      },

      // Playlist functions
      createPlaylist: (name) => {
        const id = `playlist-${Date.now()}`
        const newPlaylist: UserPlaylist = {
          id,
          name,
          songs: [],
          createdAt: Date.now()
        }
        set({ userPlaylists: [...get().userPlaylists, newPlaylist] })
        return id
      },

      deletePlaylist: (playlistId) => {
        set({ userPlaylists: get().userPlaylists.filter(p => p.id !== playlistId) })
      },

      renamePlaylist: (playlistId, newName) => {
        set({
          userPlaylists: get().userPlaylists.map(p =>
            p.id === playlistId ? { ...p, name: newName } : p
          )
        })
      },

      addToPlaylist: (playlistId, track) => {
        set({
          userPlaylists: get().userPlaylists.map(p => {
            if (p.id === playlistId) {
              // Don't add duplicates
              if (p.songs.some(s => s.id === track.id)) return p
              return { ...p, songs: [...p.songs, track] }
            }
            return p
          })
        })
      },

      removeFromPlaylist: (playlistId, trackId) => {
        set({
          userPlaylists: get().userPlaylists.map(p =>
            p.id === playlistId
              ? { ...p, songs: p.songs.filter(s => s.id !== trackId) }
              : p
          )
        })
      },

      openUserPlaylist: (playlistId) => {
        const playlist = get().userPlaylists.find(p => p.id === playlistId)
        if (playlist) {
          const { currentView, viewHistory, searchQuery, searchResults } = get()
          set({
            selectedUserPlaylist: playlist,
            currentView: 'playlist',
            searchQuery: '',
            viewHistory: [...viewHistory, { view: currentView, searchQuery, searchResults }],
            // Set as current playlist for PlaylistView
            currentPlaylist: {
              id: playlist.id,
              title: playlist.name,
              thumbnail: playlist.songs[0]?.thumbnail || '',
              songs: playlist.songs,
              description: `${playlist.songs.length} songs`
            },
            isLoadingPlaylist: false
          })
        }
      },

      isInPlaylist: (playlistId, trackId) => {
        const playlist = get().userPlaylists.find(p => p.id === playlistId)
        return playlist ? playlist.songs.some(s => s.id === trackId) : false
      }
    }),
    {
      name: 'metrolist-settings',
      partialize: (state) => ({ 
        darkMode: state.darkMode, 
        sidebarCollapsed: state.sidebarCollapsed,
        nowPlayingCollapsed: state.nowPlayingCollapsed,
        downloadPath: state.downloadPath,
        downloadQuality: state.downloadQuality,
        downloadedSongs: state.downloadedSongs,
        cacheEnabled: state.cacheEnabled,
        cachedSongs: state.cachedSongs,
        minimizeToTray: state.minimizeToTray,
        discordRpcEnabled: state.discordRpcEnabled,
        autoplayEnabled: state.autoplayEnabled,
        equalizerEnabled: state.equalizerEnabled,
        equalizerPreset: state.equalizerPreset,
        equalizerBands: state.equalizerBands,
        accentColor: state.accentColor,
        globalKeybindsEnabled: state.globalKeybindsEnabled,
        inAppKeybinds: state.inAppKeybinds,
        globalKeybinds: state.globalKeybinds,
        userPlaylists: state.userPlaylists
      })
    }
  )
)
