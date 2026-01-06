import { useEffect, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Heart, ListMusic, Loader2, AlertCircle, X, Music, PictureInPicture2, Maximize2, Mic2 } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import Tooltip from './Tooltip'

interface PlayerProps {
  showLyrics?: boolean
  onToggleLyrics?: () => void
}

export default function Player({ showLyrics = false, onToggleLyrics }: PlayerProps) {
  const { 
    currentTrack, isPlaying, volume, progress, duration, shuffle, repeat, isLoading, error,
    togglePlay, setVolume, seek, toggleShuffle, cycleRepeat, nextTrack, prevTrack, initAudio, clearError,
    toggleLike, isLiked
  } = usePlayerStore()
  const { darkMode, setView } = useAppStore()
  const [imgError, setImgError] = useState(false)

  const trackIsLiked = currentTrack ? isLiked(currentTrack.id) : false

  useEffect(() => {
    initAudio()
  }, [initAudio])

  // Reset image error when track changes
  useEffect(() => {
    setImgError(false)
  }, [currentTrack?.id])

  // Setup Media Session API for system media controls (Windows taskbar, etc.)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    
    if (currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artists.map(a => a.name).join(', '),
        artwork: [
          { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      })
    }

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      if (!isPlaying) togglePlay()
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlaying) togglePlay()
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      prevTrack()
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      nextTrack()
    })
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && duration > 0) {
        seek(details.seekTime / duration)
      }
    })

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

    return () => {
      // Clean up handlers
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
      navigator.mediaSession.setActionHandler('seekto', null)
    }
  }, [currentTrack, isPlaying, togglePlay, prevTrack, nextTrack, seek, duration])

  // Update position state for Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return
    
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: progress * duration
      })
    } catch {
      // Ignore errors - some browsers don't support this
    }
  }, [progress, duration])

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const currentTime = progress * duration

  return (
    <div className={`h-fib-89 flex items-center pl-fib-21 pr-fib-34 gap-fib-21 border-t relative
      ${darkMode ? 'bg-transparent border-ios-separator-dark' : 'bg-transparent border-ios-separator'}`}>
      
      {/* Error toast */}
      {error && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-fib-8 px-fib-13 py-fib-8 bg-ios-red text-white rounded-fib-8 flex items-center gap-fib-8 shadow-ios-lg text-fib-13">
          <AlertCircle size={16} />
          {error}
          <button onClick={clearError} className="p-fib-3 ios-active">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Track info */}
      <div className="flex items-center gap-fib-13 w-fib-233 min-w-0">
        {currentTrack ? (
          <>
            {imgError ? (
              <div className={`w-fib-55 h-fib-55 rounded-fib-8 flex items-center justify-center flex-shrink-0
                ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
                <Music size={21} className="text-ios-gray" />
              </div>
            ) : (
              <div className="w-fib-55 h-fib-55 rounded-fib-8 overflow-hidden shadow-ios flex-shrink-0">
                <img 
                  src={`https://img.youtube.com/vi/${currentTrack.id}/hqdefault.jpg`} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover scale-[1.35]"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                {currentTrack.title}
              </p>
              <p className="text-fib-13 text-ios-gray truncate">
                {currentTrack.artists.map(a => a.name).join(', ')}
              </p>
            </div>
            <Tooltip text={trackIsLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}>
              <button 
                onClick={() => currentTrack && toggleLike(currentTrack)}
                className="p-fib-8 ios-active flex-shrink-0"
              >
                <Heart 
                  size={21} 
                  className={`ios-transition ${trackIsLiked ? 'text-ios-red fill-ios-red' : 'text-ios-gray hover:text-ios-red'}`}
                />
              </button>
            </Tooltip>
          </>
        ) : (
          <div className="flex items-center gap-fib-13">
            <div className={`w-fib-55 h-fib-55 rounded-fib-8 flex-shrink-0 flex items-center justify-center
              ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
              <Music size={21} className="text-ios-gray" />
            </div>
            <p className="text-fib-13 text-ios-gray">No track playing</p>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex-1 flex flex-col items-center gap-fib-8">
        <div className="flex items-center gap-fib-21">
          <Tooltip text={shuffle ? 'Shuffle on' : 'Shuffle off'}>
            <button 
              onClick={toggleShuffle}
              className={`p-fib-5 ios-active ${shuffle ? 'text-ios-blue' : 'text-ios-gray'}`}
            >
              <Shuffle size={18} />
            </button>
          </Tooltip>
          <Tooltip text="Previous">
            <button 
              onClick={prevTrack}
              className={`p-fib-5 ios-active ios-transition ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
            >
              <SkipBack size={21} fill="currentColor" />
            </button>
          </Tooltip>
          <Tooltip text={isPlaying ? 'Pause' : 'Play'}>
            <button 
              onClick={togglePlay}
              disabled={!currentTrack || isLoading}
              className="w-fib-34 h-fib-34 flex items-center justify-center rounded-full bg-white text-black ios-active shadow-ios disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={21} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={21} fill="currentColor" />
              ) : (
                <Play size={21} fill="currentColor" className="ml-1" />
              )}
            </button>
          </Tooltip>
          <Tooltip text="Next">
            <button 
              onClick={nextTrack}
              className={`p-fib-5 ios-active ios-transition ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
            >
              <SkipForward size={21} fill="currentColor" />
            </button>
          </Tooltip>
          <Tooltip text={repeat === 'off' ? 'Repeat off' : repeat === 'one' ? 'Repeat one' : 'Repeat all'}>
            <button 
              onClick={cycleRepeat}
              className={`p-fib-5 ios-active ${repeat !== 'off' ? 'text-ios-blue' : 'text-ios-gray'}`}
            >
              <RepeatIcon size={18} />
            </button>
          </Tooltip>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-fib-377 flex items-center gap-fib-8">
          <span className="text-fib-8 text-ios-gray w-fib-34 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 relative h-4 flex items-center">
            {/* Track background */}
            <div className={`absolute inset-x-0 h-1 rounded-full ${darkMode ? 'bg-white/30' : 'bg-gray-400'}`} />
            {/* Progress fill */}
            <div 
              className="absolute left-0 h-1 rounded-full bg-ios-blue" 
              style={{ width: `${progress * 100}%` }}
            />
            {/* Invisible range input for interaction */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            {/* Thumb */}
            <div 
              className={`absolute w-3 h-3 rounded-full shadow-md pointer-events-none ${darkMode ? 'bg-white' : 'bg-ios-blue'}`}
              style={{ left: `calc(${progress * 100}% - 6px)` }}
            />
          </div>
          <span className="text-fib-8 text-ios-gray w-fib-34">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & extras */}
      <div className="flex items-center gap-fib-13 w-fib-177 flex-shrink-0">
        <Tooltip text="Queue">
          <button 
            onClick={() => setView('queue')}
            className={`p-fib-5 ios-active ios-transition ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
          >
            <ListMusic size={18} />
          </button>
        </Tooltip>
        <Tooltip text="Lyrics">
          <button 
            onClick={onToggleLyrics}
            className={`p-fib-5 ios-active ios-transition ${showLyrics ? 'text-ios-blue' : darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
          >
            <Mic2 size={18} />
          </button>
        </Tooltip>
        <Tooltip text={volume === 0 ? 'Unmute' : 'Mute'}>
          <button 
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className={`p-fib-5 ios-active ios-transition ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </Tooltip>
        <div className="w-fib-89 relative h-4 flex items-center flex-shrink-0">
          {/* Track background */}
          <div className={`absolute inset-x-0 h-1 rounded-full ${darkMode ? 'bg-white/30' : 'bg-gray-400'}`} />
          {/* Volume fill */}
          <div 
            className="absolute left-0 h-1 rounded-full bg-ios-blue" 
            style={{ width: `${volume * 100}%` }}
          />
          {/* Invisible range input for interaction */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
          {/* Thumb */}
          <div 
            className={`absolute w-3 h-3 rounded-full shadow-md pointer-events-none ${darkMode ? 'bg-white' : 'bg-ios-blue'}`}
            style={{ left: `calc(${volume * 100}% - 6px)` }}
          />
        </div>
        <Tooltip text="Mini Player">
          <button 
            onClick={async () => {
              if (typeof window !== 'undefined' && '__TAURI__' in window) {
                const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
                // Check if mini player already exists
                const existing = await WebviewWindow.getByLabel('miniplayer')
                if (existing) {
                  await existing.setFocus()
                  return
                }
                // Create new mini player window
                new WebviewWindow('miniplayer', {
                  url: '/#miniplayer',
                  title: 'Mini Player',
                  width: 360,
                  height: 620,
                  minWidth: 340,
                  minHeight: 600,
                  maxWidth: 500,
                  maxHeight: 900,
                  resizable: true,
                  decorations: false,
                  alwaysOnTop: true,
                  transparent: false,
                  center: false,
                  x: 100,
                  y: 100
                })
              }
            }}
            className={`p-fib-5 ios-active ios-transition ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
          >
            <PictureInPicture2 size={18} />
          </button>
        </Tooltip>
        <Tooltip text="Fullscreen">
          <button 
            onClick={() => {
              if ((window as any).toggleFullscreenPlayer) {
                (window as any).toggleFullscreenPlayer()
              }
            }}
            className={`p-fib-5 ios-active ios-transition ${darkMode ? 'text-ios-gray hover:text-white' : 'text-ios-gray hover:text-black'}`}
          >
            <Maximize2 size={18} />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
