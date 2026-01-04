import { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import { usePlayerStore } from './store/playerStore'

// Apply saved accent color on app load
const initAccentColor = () => {
  const stored = localStorage.getItem('metrolist-settings')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const color = parsed.state?.accentColor || '#007AFF'
      document.documentElement.style.setProperty('--accent-color', color)
    } catch {
      document.documentElement.style.setProperty('--accent-color', '#007AFF')
    }
  }
}
initAccentColor()

// Initialize global shortcuts on app load
const initGlobalShortcuts = async () => {
  if (typeof window !== 'undefined' && window.__TAURI__) {
    const stored = localStorage.getItem('metrolist-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const enabled = parsed.state?.globalKeybindsEnabled || false
        const shortcuts = parsed.state?.globalKeybinds || {
          playPause: 'Ctrl+Space',
          next: 'Ctrl+Right',
          previous: 'Ctrl+Left',
          volumeUp: 'Ctrl+Up',
          volumeDown: 'Ctrl+Down',
          mute: 'Ctrl+M',
        }
        
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('set_global_shortcuts', { enabled, shortcuts })
      } catch (e) {
        console.error('Failed to initialize global shortcuts:', e)
      }
    }
  }
}
initGlobalShortcuts()

import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import Player from './components/Player'
import NowPlayingSidebar from './components/NowPlayingSidebar'
import HomeView from './views/HomeView'
import ExploreView from './views/ExploreView'
import LibraryView from './views/LibraryView'
import SearchResults from './components/SearchResults'
import SettingsView from './views/SettingsView'
import QueueView from './views/QueueView'
import ArtistView from './views/ArtistView'
import PlaylistView from './views/PlaylistView'
import MiniPlayer from './components/MiniPlayer'
import FullscreenPlayer from './components/FullscreenPlayer'
import LyricsPanel from './components/LyricsPanel'

export default function App() {
  const { currentView, darkMode, searchQuery, showLyrics, toggleLyrics, inAppKeybinds } = useAppStore()
  const { currentTrack, restorePlayback, savePosition, initAudio, togglePlay, nextTrack, prevTrack, setVolume, volume, toggleLike } = usePlayerStore()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Check if this is the mini player window
  const isMiniPlayer = window.location.hash === '#miniplayer'

  // Expose fullscreen toggle globally for Player component
  // Uses CSS overlay fullscreen - simpler and more reliable
  useEffect(() => {
    (window as any).toggleFullscreenPlayer = () => {
      setIsFullscreen(prev => !prev)
    }
    return () => {
      delete (window as any).toggleFullscreenPlayer
    }
  }, [])

  // Block all default browser/system keybinds and only allow user's custom keybinds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't block if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Build the current key combo string
      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Meta')
      
      const keyName = e.key === ' ' ? 'Space' :
        e.key === 'ArrowUp' ? 'Up' :
        e.key === 'ArrowDown' ? 'Down' :
        e.key === 'ArrowLeft' ? 'Left' :
        e.key === 'ArrowRight' ? 'Right' :
        e.key.length === 1 ? e.key.toUpperCase() : e.key
      
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(keyName)
      }
      
      const combo = parts.join('+')
      const singleKey = e.key === ' ' ? 'Space' : e.key

      // Check if this matches any user keybind
      let matched = false

      // Check in-app keybinds (can be single key or combo)
      if (inAppKeybinds.playPause && (singleKey === inAppKeybinds.playPause || combo === inAppKeybinds.playPause)) {
        e.preventDefault()
        togglePlay()
        matched = true
      } else if (inAppKeybinds.next && (singleKey === inAppKeybinds.next || combo === inAppKeybinds.next)) {
        e.preventDefault()
        nextTrack()
        matched = true
      } else if (inAppKeybinds.previous && (singleKey === inAppKeybinds.previous || combo === inAppKeybinds.previous)) {
        e.preventDefault()
        prevTrack()
        matched = true
      } else if (inAppKeybinds.volumeUp && (singleKey === inAppKeybinds.volumeUp || combo === inAppKeybinds.volumeUp)) {
        e.preventDefault()
        setVolume(Math.min(1, volume + 0.1))
        matched = true
      } else if (inAppKeybinds.volumeDown && (singleKey === inAppKeybinds.volumeDown || combo === inAppKeybinds.volumeDown)) {
        e.preventDefault()
        setVolume(Math.max(0, volume - 0.1))
        matched = true
      } else if (inAppKeybinds.mute && (singleKey.toLowerCase() === inAppKeybinds.mute.toLowerCase() || combo === inAppKeybinds.mute)) {
        e.preventDefault()
        setVolume(volume > 0 ? 0 : 0.5)
        matched = true
      } else if (inAppKeybinds.like && (singleKey.toLowerCase() === inAppKeybinds.like.toLowerCase() || combo === inAppKeybinds.like)) {
        e.preventDefault()
        if (currentTrack) toggleLike(currentTrack)
        matched = true
      } else if (inAppKeybinds.lyrics && (singleKey.toLowerCase() === inAppKeybinds.lyrics.toLowerCase() || combo === inAppKeybinds.lyrics)) {
        e.preventDefault()
        toggleLyrics()
        matched = true
      }

      // Block all Ctrl/Alt/Meta/Shift combos that aren't user keybinds (prevents browser defaults like Ctrl+P, Ctrl+S, Ctrl+Shift+I)
      if (!matched && (e.ctrlKey || e.altKey || e.metaKey) && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }
      
      // Also block F12 (dev tools)
      if (e.key === 'F12') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [inAppKeybinds, togglePlay, nextTrack, prevTrack, setVolume, volume, currentTrack, toggleLike, toggleLyrics])

  // Restore playback state on app start (only for main window)
  useEffect(() => {
    // Skip audio initialization for mini player window
    // It shares state with main window via Zustand store
    if (isMiniPlayer) return
    
    initAudio()
    
    // Restore saved track after a short delay to ensure store is hydrated
    const timer = setTimeout(() => {
      restorePlayback()
    }, 100)

    // Save position before page unload
    const handleBeforeUnload = () => {
      savePosition()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Listen for storage events to sync state from other windows (fullscreen, miniplayer)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'metrolist-player') {
        try {
          const newState = JSON.parse(e.newValue || '{}')
          const { audioElement } = usePlayerStore.getState()
          if (audioElement && newState.state) {
            // Sync volume
            if (typeof newState.state.volume === 'number') {
              audioElement.volume = newState.state.volume
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Listen for media control events from system tray
    let unlisten: (() => void) | undefined
    
    const setupTrayListener = async () => {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { listen } = await import('@tauri-apps/api/event')
        unlisten = await listen<string>('media-control', (event) => {
          const { togglePlay, nextTrack, prevTrack, setVolume, volume, audioElement } = usePlayerStore.getState()
          switch (event.payload) {
            case 'prev':
              prevTrack()
              break
            case 'play':
            case 'play_pause':
              togglePlay()
              break
            case 'pause':
              togglePlay()
              break
            case 'next':
              nextTrack()
              break
            case 'volume_up':
              setVolume(Math.min(1, volume + 0.1))
              break
            case 'volume_down':
              setVolume(Math.max(0, volume - 0.1))
              break
            case 'mute':
              setVolume(volume > 0 ? 0 : 0.5)
              break
            case 'stop':
              if (audioElement) {
                audioElement.pause()
                audioElement.currentTime = 0
              }
              break
          }
        })
        
        // Listen for seek events from fullscreen window
        const unlistenSeek = await listen<number>('seek-to', (event) => {
          const { audioElement } = usePlayerStore.getState()
          if (audioElement && typeof event.payload === 'number') {
            audioElement.currentTime = event.payload
          }
        })
        
        // Listen for volume events from fullscreen window
        const unlistenVolume = await listen<number>('set-volume', (event) => {
          const { audioElement } = usePlayerStore.getState()
          if (typeof event.payload === 'number') {
            const vol = Math.max(0, Math.min(1, event.payload))
            if (audioElement) {
              audioElement.volume = vol
            }
            usePlayerStore.setState({ volume: vol })
          }
        })
        
        // Store all unlisteners
        const originalUnlisten = unlisten
        unlisten = () => {
          originalUnlisten?.()
          unlistenSeek()
          unlistenVolume()
        }
      }
    }
    
    setupTrayListener()
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('storage', handleStorageChange)
      if (unlisten) unlisten()
    }
  }, [isMiniPlayer])

  // Broadcast player state to other windows (miniplayer)
  useEffect(() => {
    if (isMiniPlayer) return
    if (typeof window === 'undefined' || !window.__TAURI__) return
    
    let broadcastInterval: ReturnType<typeof setInterval>
    
    const startBroadcast = async () => {
      const { emit } = await import('@tauri-apps/api/event')
      
      // Broadcast at 30ms for ultra-smooth lyrics animation (33fps)
      broadcastInterval = setInterval(() => {
        const state = usePlayerStore.getState()
        const audio = state.audioElement
        emit('player-state-update', {
          // Send actual current time for precise lyrics sync
          currentTime: audio?.currentTime || 0,
          progress: state.progress,
          duration: state.duration,
          isPlaying: state.isPlaying,
          volume: state.volume,
          currentTrackId: state.currentTrack?.id || null,
        })
      }, 30)
    }
    
    startBroadcast()
    
    return () => {
      if (broadcastInterval) clearInterval(broadcastInterval)
    }
  }, [isMiniPlayer])

  // Periodically save position while playing
  useEffect(() => {
    const interval = setInterval(() => {
      savePosition()
    }, 5000) // Save every 5 seconds
    
    return () => clearInterval(interval)
  }, [savePosition])

  // Render mini player if hash is #miniplayer
  if (isMiniPlayer) {
    return <MiniPlayer />
  }

  const renderView = () => {
    switch (currentView) {
      case 'home': return <HomeView />
      case 'explore': return <ExploreView />
      case 'library': return <LibraryView />
      case 'settings': return <SettingsView />
      case 'queue': return <QueueView />
      case 'artist': return <ArtistView />
      case 'playlist': return <PlaylistView />
      default: return <HomeView />
    }
  }

  const showSearchResults = searchQuery.trim().length > 0
  const showNowPlaying = currentTrack !== null

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'dark bg-ios-bg-dark' : 'bg-ios-bg'}`}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-hidden relative flex flex-col ${darkMode ? 'bg-ios-bg-dark' : 'bg-ios-bg'}`}>
          {showLyrics ? (
            <LyricsPanel />
          ) : (
            <>
              <div className={`h-full overflow-y-auto p-fib-21 ${showSearchResults ? 'hidden' : ''}`}>
                {renderView()}
              </div>
              {showSearchResults && <SearchResults />}
            </>
          )}
        </main>
        {showNowPlaying && <NowPlayingSidebar />}
      </div>
      <Player showLyrics={showLyrics} onToggleLyrics={toggleLyrics} />
      {isFullscreen && <FullscreenPlayer onExit={() => setIsFullscreen(false)} />}
    </div>
  )
}
