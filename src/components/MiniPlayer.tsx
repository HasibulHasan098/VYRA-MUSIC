import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1, X, Minimize2, Music, Mic2 } from 'lucide-react'
import { usePlayerStore, Song } from '../store/playerStore'
import { fetchLyrics, LyricsResult } from '../api/lyrics'

// Extract dominant color from image with better sampling
const extractColor = (img: HTMLImageElement): { r: number; g: number; b: number } => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { r: 30, g: 30, b: 40 }

  canvas.width = 100
  canvas.height = 100
  
  try {
    ctx.drawImage(img, 0, 0, 100, 100)
    const imageData = ctx.getImageData(0, 0, 100, 100).data
    let r = 0, g = 0, b = 0, count = 0

    // Sample more points for better color extraction
    for (let i = 0; i < imageData.length; i += 20) {
      const pr = imageData[i]
      const pg = imageData[i + 1]
      const pb = imageData[i + 2]
      const brightness = pr + pg + pb
      // Skip very dark and very bright pixels
      if (brightness > 80 && brightness < 650) {
        r += pr
        g += pg
        b += pb
        count++
      }
    }

    if (count === 0) return { r: 30, g: 30, b: 40 }
    
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    }
  } catch {
    return { r: 30, g: 30, b: 40 }
  }
}

export default function MiniPlayer() {
  // Get initial state from store (persisted)
  const storeState = usePlayerStore()
  
  // Local state that will be updated from main window via events
  const [currentTrack, setCurrentTrack] = useState<Song | null>(storeState.currentTrack)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(storeState.volume)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(storeState.duration)
  const [shuffle, setShuffle] = useState(storeState.shuffle)
  const [repeat, setRepeat] = useState(storeState.repeat)
  const [currentTime, setCurrentTime] = useState(0)
  
  const [imgError, setImgError] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [lineProgress, setLineProgress] = useState(0)
  const [dominantColor, setDominantColor] = useState({ r: 30, g: 30, b: 40 })
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setImgError(false)
  }, [currentTrack?.id])

  // Listen for player state updates from main window
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__TAURI__) return

    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      const { listen } = await import('@tauri-apps/api/event')
      
      unlisten = await listen<{
        currentTime: number
        progress: number
        duration: number
        isPlaying: boolean
        volume: number
        currentTrackId: string | null
      }>('player-state-update', (event) => {
        const state = event.payload
        setCurrentTime(state.currentTime)
        setProgress(state.progress)
        setDuration(state.duration)
        setIsPlaying(state.isPlaying)
        setVolumeState(state.volume)
        
        // Update track if it changed
        if (state.currentTrackId !== currentTrack?.id) {
          const newTrack = storeState.queue.find(t => t.id === state.currentTrackId)
          if (newTrack) {
            setCurrentTrack(newTrack)
          }
        }
      })
    }

    setupListener()

    return () => {
      if (unlisten) unlisten()
    }
  }, [currentTrack?.id, storeState.queue])

  // Sync with store state changes (shuffle, repeat, queue updates)
  useEffect(() => {
    setShuffle(storeState.shuffle)
    setRepeat(storeState.repeat)
    if (storeState.currentTrack?.id !== currentTrack?.id) {
      setCurrentTrack(storeState.currentTrack)
    }
  }, [storeState.shuffle, storeState.repeat, storeState.currentTrack])

  // Extract color from album art with better processing
  useEffect(() => {
    if (!currentTrack?.thumbnail) {
      setDominantColor({ r: 30, g: 30, b: 40 })
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const color = extractColor(img)
      const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000
      
      // Adjust color for better visual appeal
      if (brightness > 200) {
        // Very bright - darken significantly
        setDominantColor({
          r: Math.max(40, Math.round(color.r * 0.3)),
          g: Math.max(40, Math.round(color.g * 0.3)),
          b: Math.max(50, Math.round(color.b * 0.35))
        })
      } else if (brightness > 140) {
        // Bright - darken moderately
        setDominantColor({
          r: Math.round(color.r * 0.6),
          g: Math.round(color.g * 0.6),
          b: Math.round(color.b * 0.7)
        })
      } else if (brightness < 60) {
        // Very dark - brighten
        setDominantColor({
          r: Math.min(100, Math.round(color.r * 1.5)),
          g: Math.min(100, Math.round(color.g * 1.5)),
          b: Math.min(120, Math.round(color.b * 1.6))
        })
      } else {
        // Good range - slight adjustment
        setDominantColor({
          r: Math.round(color.r * 1.1),
          g: Math.round(color.g * 1.1),
          b: Math.round(color.b * 1.2)
        })
      }
    }
    img.src = currentTrack.thumbnail
  }, [currentTrack?.thumbnail])

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null)
      return
    }

    const loadLyrics = async () => {
      const artistName = currentTrack.artists.map(a => a.name).join(', ')
      const result = await fetchLyrics(currentTrack.title, artistName, currentTrack.duration || duration)
      setLyrics(result)
      setCurrentLineIndex(-1)
      setLineProgress(0)
    }

    loadLyrics()
  }, [currentTrack?.id, duration])

  // Calculate current line and progress
  const { calculatedLineIndex, calculatedProgress } = useMemo(() => {
    if (!lyrics?.syncedLyrics || currentTime <= 0) {
      return { calculatedLineIndex: -1, calculatedProgress: 0 }
    }

    let lineIdx = -1
    let nextLineTime = duration || currentTime + 10
    
    for (let i = lyrics.syncedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics.syncedLyrics[i].time) {
        lineIdx = i
        if (i < lyrics.syncedLyrics.length - 1) {
          nextLineTime = lyrics.syncedLyrics[i + 1].time
        }
        break
      }
    }

    let prog = 0
    if (lineIdx >= 0) {
      const lineStartTime = lyrics.syncedLyrics[lineIdx].time
      const lineDuration = nextLineTime - lineStartTime
      if (lineDuration > 0) {
        prog = Math.min(1, Math.max(0, (currentTime - lineStartTime) / lineDuration))
      }
    }

    return { calculatedLineIndex: lineIdx, calculatedProgress: prog }
  }, [currentTime, lyrics, duration])

  useEffect(() => {
    if (calculatedLineIndex !== currentLineIndex) {
      setCurrentLineIndex(calculatedLineIndex)
    }
    setLineProgress(calculatedProgress)
  }, [calculatedLineIndex, calculatedProgress, currentLineIndex])

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex] && containerRef.current) {
      const line = lineRefs.current[currentLineIndex]
      const container = containerRef.current
      
      if (line) {
        const lineTop = line.offsetTop
        const lineHeight = line.offsetHeight
        const containerHeight = container.offsetHeight
        
        container.scrollTo({
          top: lineTop - containerHeight / 3 + lineHeight / 2,
          behavior: 'smooth'
        })
      }
    }
  }, [currentLineIndex])

  const handleLineClick = useCallback(async (time: number) => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      const { emit } = await import('@tauri-apps/api/event')
      await emit('seek-to', time)
    }
  }, [])

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const currentTimeDisplay = progress * duration

  // Send commands to main window
  const sendCommand = useCallback(async (command: string) => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      const { emit } = await import('@tauri-apps/api/event')
      await emit('media-control', command)
    }
  }, [])

  const handleTogglePlay = useCallback(() => {
    sendCommand('play_pause')
  }, [sendCommand])

  const handleNextTrack = useCallback(() => {
    sendCommand('next')
  }, [sendCommand])

  const handlePrevTrack = useCallback(() => {
    sendCommand('prev')
  }, [sendCommand])

  const handleToggleShuffle = useCallback(() => {
    storeState.toggleShuffle()
  }, [storeState])

  const handleCycleRepeat = useCallback(() => {
    storeState.cycleRepeat()
  }, [storeState])

  const handleVolumeChange = useCallback(async (newVolume: number) => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      const { emit } = await import('@tauri-apps/api/event')
      await emit('set-volume', newVolume)
    }
  }, [])

  const handleSeek = useCallback(async (time: number) => {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      const { emit } = await import('@tauri-apps/api/event')
      await emit('seek-to', time * duration)
    }
  }, [duration])

  const closeMiniPlayer = async () => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    }
  }

  const { r, g, b } = dominantColor
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  const accentColor = `rgb(${r}, ${g}, ${b})`
  const accentColorBright = brightness > 140 
    ? `rgb(${Math.max(120, r - 20)}, ${Math.max(120, g - 20)}, ${Math.max(140, b - 10)})`
    : `rgb(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)})`

  const backgroundStyle = showLyrics ? {
    background: `linear-gradient(180deg, 
      rgba(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)}, 0.6) 0%, 
      rgba(${Math.floor(r * 0.2)}, ${Math.floor(g * 0.2)}, ${Math.floor(b * 0.2)}, 0.95) 30%,
      rgb(10, 10, 15) 100%)`,
  } : {
    background: `linear-gradient(180deg, 
      rgba(${Math.floor(r * 0.4)}, ${Math.floor(g * 0.4)}, ${Math.floor(b * 0.4)}, 0.3) 0%, 
      rgb(12, 12, 16) 50%,
      rgb(8, 8, 12) 100%)`
  }

  // Get volume icon based on level
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  // Render animated text
  const renderAnimatedText = useCallback((text: string, isCurrentLine: boolean, prog: number) => {
    if (!isCurrentLine) {
      return <span>{text}</span>
    }

    const chars = text.split('')
    const revealedCount = prog * chars.length

    return (
      <>
        {chars.map((char, i) => {
          const isRevealed = i < revealedCount
          return (
            <span
              key={i}
              style={{
                color: isRevealed ? accentColorBright : 'rgba(255, 255, 255, 0.3)',
                textShadow: isRevealed ? `0 0 15px ${accentColor}` : 'none',
              }}
            >
              {char}
            </span>
          )
        })}
      </>
    )
  }, [accentColor, accentColorBright])

  return (
    <div className="h-screen w-screen text-white flex flex-col overflow-hidden select-none" style={backgroundStyle}>
      {/* Header with drag handle & close - Fixed height */}
      <div data-tauri-drag-region className="flex items-center justify-between px-4 py-3 shrink-0 backdrop-blur-sm bg-black/20" style={{ minHeight: '48px' }}>
        <div className="flex items-center gap-2">
          <Minimize2 size={14} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-400">Mini Player</span>
        </div>
        <button 
          onClick={closeMiniPlayer} 
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0"
        >
          <X size={16} className="text-gray-400 hover:text-white" />
        </button>
      </div>

      {showLyrics && lyrics?.syncedLyrics ? (
        /* Lyrics View */
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto px-5 min-h-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          <div className="min-h-full flex flex-col pt-4 pb-[35vh]">
            {lyrics.syncedLyrics.map((line, index) => {
              const isCurrentLine = index === currentLineIndex
              const isPastLine = index < currentLineIndex
              
              return (
                <div
                  key={index}
                  ref={el => lineRefs.current[index] = el}
                  onClick={() => handleLineClick(line.time)}
                  className="py-2 cursor-pointer font-bold leading-tight transition-all duration-300"
                  style={{
                    fontSize: isCurrentLine ? '1.15rem' : '0.95rem',
                    color: isPastLine ? 'rgba(255,255,255,0.25)' : isCurrentLine ? undefined : 'rgba(255,255,255,0.4)',
                    transform: isCurrentLine ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: 'left center',
                  }}
                >
                  {renderAnimatedText(line.text, isCurrentLine, lineProgress)}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Album Art View - Responsive sizing with proper spacing */
        <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
          {currentTrack ? (
            <div className="relative group w-full" style={{ maxWidth: '260px', aspectRatio: '1/1' }}>
              {imgError ? (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-2xl">
                  <Music size={56} className="text-gray-600" />
                </div>
              ) : (
                <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                  <img 
                    src={`https://img.youtube.com/vi/${currentTrack.id}/maxresdefault.jpg`} 
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                  {/* Subtle overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>
              )}
              {/* Glow effect */}
              <div 
                className="absolute inset-0 -z-10 blur-3xl opacity-40 rounded-2xl"
                style={{ 
                  background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
                  transform: 'scale(1.1)'
                }}
              />
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center shadow-2xl" style={{ maxWidth: '260px', aspectRatio: '1/1' }}>
              <Music size={56} className="text-gray-600" />
            </div>
          )}
        </div>
      )}

      {/* Track Info - Fixed height with proper spacing */}
      <div className="px-5 pb-2 shrink-0" style={{ minHeight: '60px', maxHeight: '60px' }}>
        <p className="font-bold text-base truncate mb-1 leading-tight" style={{ color: 'white' }}>
          {currentTrack?.title || 'No track playing'}
        </p>
        <p className="text-sm text-gray-400 truncate leading-tight">
          {currentTrack?.artists.map(a => a.name).join(', ') || 'Unknown artist'}
        </p>
      </div>

      {/* Progress Bar - Fixed height */}
      <div className="px-5 pb-2 shrink-0" style={{ minHeight: '48px', maxHeight: '48px' }}>
        <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="absolute h-full rounded-full transition-all duration-100"
            style={{ 
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${accentColor}, ${accentColorBright})`
            }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
          <span className="font-medium">{formatTime(currentTimeDisplay)}</span>
          <span className="font-medium">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls - Fixed height */}
      <div className="flex items-center justify-center gap-4 pb-3 shrink-0" style={{ minHeight: '76px', maxHeight: '76px' }}>
        <button 
          onClick={handlePrevTrack} 
          className="p-2 text-white/80 hover:text-white hover:scale-110 transition-all active:scale-95 shrink-0"
        >
          <SkipBack size={22} fill="currentColor" />
        </button>
        <button 
          onClick={handleTogglePlay}
          disabled={!currentTrack}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shrink-0"
        >
          {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
        </button>
        <button 
          onClick={handleNextTrack} 
          className="p-2 text-white/80 hover:text-white hover:scale-110 transition-all active:scale-95 shrink-0"
        >
          <SkipForward size={22} fill="currentColor" />
        </button>
      </div>

      {/* Secondary Controls - Fixed height */}
      <div className="flex items-center justify-between px-5 pb-4 shrink-0" style={{ minHeight: '52px', maxHeight: '52px' }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.8)} 
            className="p-1.5 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <VolumeIcon size={18} />
          </button>
          <button 
            onClick={handleToggleShuffle} 
            className={`p-1.5 transition-colors shrink-0 ${shuffle ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            style={{ color: shuffle ? accentColorBright : undefined }}
          >
            <Shuffle size={18} />
          </button>
          <button 
            onClick={handleCycleRepeat} 
            className={`p-1.5 transition-colors shrink-0 ${repeat !== 'off' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            style={{ color: repeat !== 'off' ? accentColorBright : undefined }}
          >
            <RepeatIcon size={18} />
          </button>
        </div>
        <button 
          onClick={() => setShowLyrics(!showLyrics)} 
          className={`p-1.5 transition-colors shrink-0 ${showLyrics ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          style={{ color: showLyrics ? accentColorBright : undefined }}
          title="Toggle Lyrics"
        >
          <Mic2 size={18} />
        </button>
      </div>
    </div>
  )
}
