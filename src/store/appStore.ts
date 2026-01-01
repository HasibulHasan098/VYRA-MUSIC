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
  // User playlists
  userPlaylists: UserPlaylist[]
  selectedUserPlaylist: UserPlaylist | null
  
  setView: (view: View) => void
  setLibraryTab: (tab: LibraryTab) => void
  goBack: () => void
  toggleDarkMode: () => void
  toggleSidebar: () => void
  toggleNowPlaying: () => void
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
      // User playlists
      userPlaylists: [],
      selectedUserPlaylist: null,

      setView: (view) => {
        const { currentView, viewHistory, searchQuery, searchResults } = get()
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
          const songs = await youtube.getRecommendations(videoIds)
          set({ recommendations: songs, isLoadingRecommendations: false })
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
        userPlaylists: state.userPlaylists
      })
    }
  )
)
