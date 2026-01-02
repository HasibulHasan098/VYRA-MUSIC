import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, X, GripHorizontal, Music, Mic2 } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { fetchLyrics, LyricsResult } from '../api/lyrics'

// Extract dominant color from image
const extractColor = (img: HTMLImageElement): { r: number; g: number; b: number } => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { r: 100, g: 100, b: 100 }

  canvas.width = 50
  canvas.height = 50
  
  try {
    ctx.drawImage(img, 0, 0, 50, 50)
    const imageData = ctx.getImageData(0, 0, 50, 50).data
    let r = 0, g = 0, b = 0, count = 0

    for (let i = 0; i < imageData.length; i += 16) {
      const pr = imageData[i]
      const pg = imageData[i + 1]
      const pb = imageData[i + 2]
      if (pr + pg + pb > 50 && pr + pg + pb < 700) {
        r += pr
        g += pg
        b += pb
        count++
      }
    }

    if (count === 0) return { r: 100, g: 100, b: 100 }
    
    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    }
  } catch {
    return { r: 100, g: 100, b: 100 }
  }
}

export default function MiniPlayer() {
  const { 
    currentTrack, isPlaying, volume, progress, duration, shuffle, repeat, audioElement,
    togglePlay, setVolume, seek, toggleShuffle, cycleRepeat, nextTrack, prevTrack
  } = usePlayerStore()
  const [imgError, setImgError] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [lineProgress, setLineProgress] = useState(0)
  const [dominantColor, setDominantColor] = useState({ r: 80, g: 80, b: 120 })
  const [currentTime, setCurrentTime] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setImgError(false)
  }, [currentTrack?.id])

  // High-frequency time update for smooth animation
  useEffect(() => {
    if (!audioElement) return

    const updateTime = () => {
      setCurrentTime(audioElement.currentTime)
    }

    audioElement.addEventListener('timeupdate', updateTime)
    const interval = setInterval(updateTime, 50)

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      clearInterval(interval)
    }
  }, [audioElement])

  // Extract color from album art
  useEffect(() => {
    if (!currentTrack?.thumbnail) {
      setDominantColor({ r: 80, g: 80, b: 120 })
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const color = extractColor(img)
      const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000
      
      if (brightness > 180) {
        setDominantColor({
          r: Math.max(60, Math.round(color.r * 0.4)),
          g: Math.max(60, Math.round(color.g * 0.4)),
          b: Math.max(80, Math.round(color.b * 0.5))
        })
      } else if (brightness > 120) {
        setDominantColor({
          r: Math.round(color.r * 0.8),
          g: Math.round(color.g * 0.8),
          b: Math.round(color.b * 0.9)
        })
      } else {
        const boost = 1.3
        setDominantColor({
          r: Math.min(255, Math.round(color.r * boost)),
          g: Math.min(255, Math.round(color.g * boost)),
          b: Math.min(255, Math.round(color.b * boost))
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

  const handleLineClick = useCallback((time: number) => {
    if (audioElement) {
      audioElement.currentTime = time
    }
  }, [audioElement])

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const currentTimeDisplay = progress * duration

  const closeMiniPlayer = async () => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    }
  }

  const { r, g, b } = dominantColor
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  const accentColor = `rgb(${r}, ${g}, ${b})`
  const accentColorBright = brightness > 150 
    ? `rgb(${Math.max(100, r - 30)}, ${Math.max(100, g - 30)}, ${Math.max(120, b - 20)})`
    : `rgb(${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)})`

  const backgroundStyle = showLyrics ? {
    background: `linear-gradient(180deg, 
      rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}, 0.5) 0%, 
      rgba(${Math.floor(r * 0.15)}, ${Math.floor(g * 0.15)}, ${Math.floor(b * 0.15)}, 0.95) 40%,
      rgb(12, 12, 18) 100%)`,
  } : { background: 'black' }

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
      {/* Drag handle & close */}
      <div data-tauri-drag-region className="flex items-center justify-between px-3 py-2 shrink-0">
        <GripHorizontal size={16} className="text-gray-500" />
        <button onClick={closeMiniPlayer} className="p-1 hover:bg-white/10 rounded">
          <X size={16} />
        </button>
      </div>

      {showLyrics && lyrics?.syncedLyrics ? (
        /* Lyrics View */
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          <div className="min-h-full flex flex-col pt-2 pb-[30vh]">
            {lyrics.syncedLyrics.map((line, index) => {
              const isCurrentLine = index === currentLineIndex
              const isPastLine = index < currentLineIndex
              
              return (
                <div
                  key={index}
                  ref={el => lineRefs.current[index] = el}
                  onClick={() => handleLineClick(line.time)}
                  className="py-1.5 cursor-pointer font-bold leading-snug"
                  style={{
                    fontSize: isCurrentLine ? '1.1rem' : '0.95rem',
                    color: isPastLine ? 'rgba(255,255,255,0.2)' : isCurrentLine ? undefined : 'rgba(255,255,255,0.35)',
                    transform: isCurrentLine ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: 'left center',
                    transition: 'transform 0.3s ease, font-size 0.3s ease',
                  }}
                >
                  {renderAnimatedText(line.text, isCurrentLine, lineProgress)}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Album art view */
        <div className="flex-1 flex items-center justify-center px-6 py-2">
          {currentTrack ? (
            imgError ? (
              <div className="w-40 h-40 rounded-lg bg-gray-800 flex items-center justify-center">
                <Music size={48} className="text-gray-600" />
              </div>
            ) : (
              <div className="w-40 h-40 rounded-lg overflow-hidden shadow-2xl">
                <img 
                  src={`https://img.youtube.com/vi/${currentTrack.id}/maxresdefault.jpg`} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover scale-[1.15]"
                  onError={() => setImgError(true)}
                />
              </div>
            )
          ) : (
            <div className="w-40 h-40 rounded-lg bg-gray-800 flex items-center justify-center">
              <Music size={48} className="text-gray-600" />
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 py-2 shrink-0">
        <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="p-1 text-gray-400 hover:text-white">
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button 
          onClick={() => setShowLyrics(!showLyrics)} 
          className={`p-1 ${showLyrics ? 'text-ios-blue' : 'text-gray-400 hover:text-white'}`}
          title="Toggle Lyrics"
        >
          <Mic2 size={16} />
        </button>
        <button onClick={toggleShuffle} className={`p-1 ${shuffle ? 'text-ios-blue' : 'text-gray-400 hover:text-white'}`}>
          <Shuffle size={16} />
        </button>
        <button onClick={prevTrack} className="p-1 text-white hover:scale-110 transition">
          <SkipBack size={20} fill="white" />
        </button>
        <button 
          onClick={togglePlay}
          disabled={!currentTrack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition disabled:opacity-50"
        >
          {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-0.5" />}
        </button>
        <button onClick={nextTrack} className="p-1 text-white hover:scale-110 transition">
          <SkipForward size={20} fill="white" />
        </button>
        <button onClick={cycleRepeat} className={`p-1 ${repeat !== 'off' ? 'text-ios-blue' : 'text-gray-400 hover:text-white'}`}>
          <RepeatIcon size={16} />
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>{formatTime(currentTimeDisplay)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="relative h-1 bg-gray-700 rounded-full">
          <div 
            className="absolute h-full bg-white rounded-full" 
            style={{ width: `${progress * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Track info */}
      <div className="px-4 pb-3 shrink-0">
        <p className="font-semibold text-sm truncate">
          {currentTrack?.title || 'No track'}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {currentTrack?.artists.map(a => a.name).join(', ') || 'Unknown artist'}
        </p>
      </div>
    </div>
  )
}
