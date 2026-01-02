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
  const { currentView, darkMode, searchQuery, showLyrics, toggleLyrics } = useAppStore()
  const { currentTrack, restorePlayback, savePosition, initAudio, togglePlay, nextTrack, prevTrack } = usePlayerStore()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Check if this is the mini player window
  const isMiniPlayer = window.location.hash === '#miniplayer'

  // Expose fullscreen toggle globally for Player component
  useEffect(() => {
    (window as any).toggleFullscreenPlayer = () => setIsFullscreen(prev => !prev)
    return () => {
      delete (window as any).toggleFullscreenPlayer
    }
  }, [])

  // Restore playback state on app start
  useEffect(() => {
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
    
    // Listen for media control events from system tray
    let unlisten: (() => void) | undefined
    
    const setupTrayListener = async () => {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const { listen } = await import('@tauri-apps/api/event')
        unlisten = await listen<string>('media-control', (event) => {
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
            case 'stop':
              // Stop playback
              const audio = usePlayerStore.getState().audioElement
              if (audio) {
                audio.pause()
                audio.currentTime = 0
              }
              break
          }
        })
      }
    }
    
    setupTrayListener()
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (unlisten) unlisten()
    }
  }, [])

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
