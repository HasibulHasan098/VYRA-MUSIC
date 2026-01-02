import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Loader2, Music2 } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
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

export default function LyricsPanel() {
  const { currentTrack, duration, audioElement } = usePlayerStore()
  const { darkMode } = useAppStore()
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [lineProgress, setLineProgress] = useState(0)
  const [dominantColor, setDominantColor] = useState({ r: 80, g: 80, b: 120 })
  const [currentTime, setCurrentTime] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Prevent space from scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // High-frequency time update for smooth animation
  useEffect(() => {
    if (!audioElement) return

    const updateTime = () => {
      setCurrentTime(audioElement.currentTime)
    }

    // Use timeupdate event and also poll for smoother updates
    audioElement.addEventListener('timeupdate', updateTime)
    const interval = setInterval(updateTime, 50) // 20fps for smooth animation

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
      
      // Calculate brightness (0-255)
      const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000
      
      // If color is too bright (light album art), darken it significantly
      if (brightness > 180) {
        // Use a darker, more saturated version
        setDominantColor({
          r: Math.max(60, Math.round(color.r * 0.4)),
          g: Math.max(60, Math.round(color.g * 0.4)),
          b: Math.max(80, Math.round(color.b * 0.5))
        })
      } else if (brightness > 120) {
        // Medium brightness - slight darkening
        setDominantColor({
          r: Math.round(color.r * 0.8),
          g: Math.round(color.g * 0.8),
          b: Math.round(color.b * 0.9)
        })
      } else {
        // Dark colors - boost them
        const boost = 1.3
        setDominantColor({
          r: Math.min(255, Math.round(color.r * boost)),
          g: Math.min(255, Math.round(color.g * boost)),
          b: Math.min(255, Math.round(color.b * boost))
        })
      }
    }
    img.onerror = () => {
      setDominantColor({ r: 80, g: 80, b: 120 })
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
      setLoading(true)
      setError(null)
      setCurrentLineIndex(-1)
      setLineProgress(0)
      
      const artistName = currentTrack.artists.map(a => a.name).join(', ')
      const result = await fetchLyrics(currentTrack.title, artistName, currentTrack.duration || duration)
      
      if (result) {
        setLyrics(result)
      } else {
        setError('No lyrics found for this song')
      }
      setLoading(false)
    }

    loadLyrics()
  }, [currentTrack?.id, duration])

  // Calculate current line and progress based on time
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

  // Update state when calculated values change
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

  const { r, g, b } = dominantColor
  
  // Calculate if we need to ensure contrast
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  
  // For light colors, use the color as-is for glow but ensure text is readable
  // For dark colors, brighten for visibility
  const accentColor = `rgb(${r}, ${g}, ${b})`
  const accentColorBright = brightness > 150 
    ? `rgb(${Math.max(100, r - 30)}, ${Math.max(100, g - 30)}, ${Math.max(120, b - 20)})` // Darken for light themes
    : `rgb(${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)})` // Brighten for dark themes

  // Different backgrounds for dark/light mode
  const backgroundStyle = darkMode ? {
    background: `linear-gradient(180deg, 
      rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}, 0.5) 0%, 
      rgba(${Math.floor(r * 0.15)}, ${Math.floor(g * 0.15)}, ${Math.floor(b * 0.15)}, 0.95) 40%,
      rgb(12, 12, 18) 100%)`,
  } : {
    background: `linear-gradient(180deg, 
      rgba(${Math.min(255, r + 100)}, ${Math.min(255, g + 100)}, ${Math.min(255, b + 100)}, 0.6) 0%, 
      rgba(${Math.min(255, r + 150)}, ${Math.min(255, g + 150)}, ${Math.min(255, b + 150)}, 0.4) 40%,
      rgb(245, 245, 250) 100%)`,
  }

  // Text colors for light/dark mode
  const textColorPast = darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)'
  const textColorUpcoming = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)'
  const textColorRevealed = darkMode ? accentColorBright : `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`
  const textColorUnrevealed = darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)'
  
  // More aggressive glow
  const glowStyle = darkMode 
    ? `0 0 30px ${accentColor}, 0 0 60px ${accentColor}, 0 0 90px ${accentColor}` 
    : `0 0 25px ${accentColor}, 0 0 50px ${accentColor}, 0 0 80px rgba(${r}, ${g}, ${b}, 0.6)`

  // Render animated text with karaoke-style fill
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
                color: isRevealed ? textColorRevealed : textColorUnrevealed,
                textShadow: isRevealed ? glowStyle : 'none',
              }}
            >
              {char}
            </span>
          )
        })}
      </>
    )
  }, [textColorRevealed, textColorUnrevealed, glowStyle])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={backgroundStyle}>
        <Loader2 size={40} className="animate-spin mb-4" style={{ color: accentColor }} />
        <p className="text-white/60">Loading lyrics...</p>
      </div>
    )
  }

  if (error || !lyrics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={backgroundStyle}>
        <Music2 size={64} className="text-white/30 mb-4" />
        <p className="text-white/60 text-lg">{error || 'No lyrics available'}</p>
      </div>
    )
  }

  if (!currentTrack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center" style={backgroundStyle}>
        <Music2 size={64} className="text-white/30 mb-4" />
        <p className="text-white/60 text-lg">Play a song to see lyrics</p>
      </div>
    )
  }

  if (lyrics.syncedLyrics) {
    return (
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-8 pl-10"
        style={{ 
          ...backgroundStyle,
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none' 
        }}
        tabIndex={-1}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <div className="min-h-full flex flex-col pt-8 pb-[50vh]">
          {lyrics.syncedLyrics.map((line, index) => {
            const isCurrentLine = index === currentLineIndex
            const isPastLine = index < currentLineIndex
            
            return (
              <div
                key={index}
                ref={el => lineRefs.current[index] = el}
                onClick={() => handleLineClick(line.time)}
                className="py-2 cursor-pointer font-bold leading-snug"
                style={{
                  fontSize: isCurrentLine ? '2rem' : '1.5rem',
                  color: isPastLine ? textColorPast : isCurrentLine ? undefined : textColorUpcoming,
                  transform: isCurrentLine ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: 'left center',
                  transition: 'transform 0.3s ease, font-size 0.3s ease',
                  paddingLeft: '4px',
                }}
              >
                {renderAnimatedText(line.text, isCurrentLine, lineProgress)}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8" style={backgroundStyle}>
      <div className={`whitespace-pre-wrap text-xl leading-loose font-medium ${darkMode ? 'text-white/80' : 'text-black/70'}`}>
        {lyrics.plainLyrics}
      </div>
    </div>
  )
}
