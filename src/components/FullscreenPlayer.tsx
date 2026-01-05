import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Heart, ListMusic, Loader2, Music, Minimize2, Mic2 } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import { fetchLyrics, LyricsResult } from '../api/lyrics'

interface FullscreenPlayerProps {
  onExit: () => void
}

// Extract dominant color from image
function extractColor(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'rgb(30, 50, 40)'
  
  canvas.width = 50
  canvas.height = 50
  ctx.drawImage(img, 0, 0, 50, 50)
  
  const imageData = ctx.getImageData(0, 0, 50, 50).data
  let r = 0, g = 0, b = 0, count = 0
  
  for (let i = 0; i < imageData.length; i += 16) {
    r += imageData[i]
    g += imageData[i + 1]
    b += imageData[i + 2]
    count++
  }
  
  r = Math.floor(r / count)
  g = Math.floor(g / count)
  b = Math.floor(b / count)
  
  // Darken the color for better contrast
  r = Math.floor(r * 0.4)
  g = Math.floor(g * 0.4)
  b = Math.floor(b * 0.4)
  
  return `rgb(${r}, ${g}, ${b})`
}

export default function FullscreenPlayer({ onExit }: FullscreenPlayerProps) {
  const { 
    currentTrack, isPlaying, volume, progress, duration, shuffle, repeat, isLoading, queue, queueIndex, audioElement,
    togglePlay, setVolume, seek, toggleShuffle, cycleRepeat, nextTrack, prevTrack,
    toggleLike, isLiked, playTrackFromQueue
  } = usePlayerStore()
  const { setView, openArtist } = useAppStore()
  const [imgError, setImgError] = useState(false)
  const [bgColor, setBgColor] = useState('rgb(30, 50, 40)')
  const [dominantColor, setDominantColor] = useState({ r: 30, g: 50, b: 40 })
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const [lineProgress, setLineProgress] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Enter true fullscreen (hides taskbar) when mounted
  useEffect(() => {
    const enterFullscreen = async () => {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window')
          const win = getCurrentWindow()
          // Small delay to ensure component is rendered
          await new Promise(r => setTimeout(r, 100))
          await win.setFullscreen(true)
        } catch (e) {
          console.error('Fullscreen error:', e)
        }
      }
    }
    
    enterFullscreen()
    
    return () => {
      // Exit fullscreen when component unmounts
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().setFullscreen(false).catch(() => {})
        }).catch(() => {})
      }
    }
  }, [])

  const trackIsLiked = currentTrack ? isLiked(currentTrack.id) : false

  // Control handlers - direct access to audio element (same window)
  const handleTogglePlay = useCallback(() => {
    togglePlay()
  }, [togglePlay])

  const handleNextTrack = useCallback(() => {
    nextTrack()
  }, [nextTrack])

  const handlePrevTrack = useCallback(() => {
    prevTrack()
  }, [prevTrack])

  const handleToggleShuffle = useCallback(() => {
    toggleShuffle()
  }, [toggleShuffle])

  const handleCycleRepeat = useCallback(() => {
    cycleRepeat()
  }, [cycleRepeat])

  const handleSetVolume = useCallback((vol: number) => {
    setVolume(vol)
  }, [setVolume])

  const handleToggleMute = useCallback(() => {
    setVolume(volume > 0 ? 0 : 0.8)
  }, [volume, setVolume])

  useEffect(() => {
    setImgError(false)
  }, [currentTrack?.id])

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics(null)
      return
    }

    const loadLyrics = async () => {
      setLyricsLoading(true)
      setCurrentLineIndex(-1)
      setLineProgress(0)
      
      const artistName = currentTrack.artists.map(a => a.name).join(', ')
      const result = await fetchLyrics(currentTrack.title, artistName, currentTrack.duration || duration)
      setLyrics(result)
      setLyricsLoading(false)
    }

    loadLyrics()
  }, [currentTrack?.id, duration])

  // High-frequency animation loop for smooth lyrics
  // Direct access to audioElement - same window, no IPC
  const lineProgressRef = useRef(0)
  const lastProgressUpdateRef = useRef(0)
  const stableLineIndexRef = useRef(-1)
  
  useEffect(() => {
    if (!showLyrics || !lyrics?.syncedLyrics || !audioElement) return
    
    let animationId: number
    
    const animate = () => {
      const time = audioElement.currentTime
      const dur = audioElement.duration || duration || 1
      const now = performance.now()
      
      // Calculate current line based on time
      let lineIdx = -1
      let nextLineTime = dur
      
      for (let i = lyrics.syncedLyrics!.length - 1; i >= 0; i--) {
        if (time >= lyrics.syncedLyrics![i].time) {
          lineIdx = i
          if (i < lyrics.syncedLyrics!.length - 1) {
            nextLineTime = lyrics.syncedLyrics![i + 1].time
          }
          break
        }
      }
      
      // Calculate progress within current line
      let prog = 0
      if (lineIdx >= 0) {
        const lineStartTime = lyrics.syncedLyrics![lineIdx].time
        const lineDuration = nextLineTime - lineStartTime
        if (lineDuration > 0) {
          prog = Math.min(1, Math.max(0, (time - lineStartTime) / lineDuration))
        }
      }
      
      // Store progress in ref
      lineProgressRef.current = prog
      
      // Only update line index state if it changed
      if (lineIdx !== stableLineIndexRef.current) {
        stableLineIndexRef.current = lineIdx
        setCurrentLineIndex(lineIdx)
      }
      
      // Update progress every 50ms for smooth animation
      const shouldUpdateProgress = now - lastProgressUpdateRef.current > 50
      if (shouldUpdateProgress) {
        setLineProgress(prog)
        lastProgressUpdateRef.current = now
      }
      
      animationId = requestAnimationFrame(animate)
    }
    
    animationId = requestAnimationFrame(animate)
    
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [showLyrics, lyrics, audioElement, duration])

  // Auto-scroll lyrics - center active line
  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex] && lyricsContainerRef.current) {
      const line = lineRefs.current[currentLineIndex]
      const container = lyricsContainerRef.current
      
      if (line) {
        const lineTop = line.offsetTop
        const lineHeight = line.offsetHeight
        const containerHeight = container.offsetHeight
        
        // Center the line in the container
        container.scrollTo({
          top: lineTop - (containerHeight / 2) + (lineHeight / 2),
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

  // Custom seek handler for progress bar
  const handleSeek = useCallback((progressValue: number) => {
    if (audioElement && duration > 0) {
      audioElement.currentTime = progressValue * duration
    } else {
      seek(progressValue)
    }
  }, [audioElement, duration, seek])

  // Extract color from album art - regenerate for each song
  useEffect(() => {
    // Reset to default when track changes
    setBgColor('rgb(30, 50, 40)')
    setDominantColor({ r: 75, g: 125, b: 100 })
    
    if (!currentTrack?.id) return
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const color = extractColor(img)
      setBgColor(color)
      // Parse RGB values for animated background
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        setDominantColor({
          r: parseInt(match[1]) * 2.5, // Brighten for lyrics
          g: parseInt(match[2]) * 2.5,
          b: parseInt(match[3]) * 2.5
        })
      }
    }
    // Use YouTube thumbnail based on track ID for consistent color extraction
    img.src = `https://img.youtube.com/vi/${currentTrack.id}/hqdefault.jpg`
  }, [currentTrack?.id])

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-hide cursor and controls after 3 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setControlsVisible(true)
      
      // Clear existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      
      // Set new timeout to hide after 3 seconds
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false)
      }, 3000)
    }
    
    // Initial timeout
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, 3000)
    
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  // Handle exit - just call onExit, the useEffect cleanup will handle exiting fullscreen
  const handleExit = () => {
    onExit()
  }

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const currentTimeFormatted = progress * duration
  const nextTracks = queue.slice(queueIndex + 1, queueIndex + 4)

  const { r, g, b } = dominantColor
  const accentColor = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`

  // Render animated text with karaoke-style fill using CSS gradient mask
  // Render animated text with karaoke-style character-by-character glow (same as LyricsPanel)
  // Uses Intl.Segmenter for proper Unicode grapheme handling (Bengali, Arabic, etc.)
  const renderAnimatedText = useCallback((text: string, isCurrentLine: boolean, prog: number) => {
    if (!isCurrentLine) {
      return <span>{text}</span>
    }

    // Use Intl.Segmenter for proper grapheme clustering (handles Bengali, Arabic, emoji, etc.)
    let graphemes: string[]
    // @ts-ignore - Intl.Segmenter is available in modern browsers but not in all TS libs
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      // @ts-ignore
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
      graphemes = Array.from(segmenter.segment(text), (s: { segment: string }) => s.segment)
    } else {
      // Fallback for older browsers - use spread operator which handles some cases
      graphemes = [...text]
    }
    
    const revealedCount = prog * graphemes.length
    
    // Use album art color for glow
    const glowR = Math.min(255, r + 50)
    const glowG = Math.min(255, g + 50)
    const glowB = Math.min(255, b + 50)
    const glowColor = `rgb(${glowR}, ${glowG}, ${glowB})`
    const accentColor = `rgb(${r}, ${g}, ${b})`
    const glowStyle = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 40px ${accentColor}`

    return (
      <>
        {graphemes.map((char, i) => {
          const isRevealed = i < revealedCount
          const waveDelay = i * 0.05
          
          return (
            <span
              key={i}
              style={{
                color: isRevealed ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                textShadow: isRevealed ? glowStyle : 'none',
                display: 'inline-block',
                animation: isRevealed ? 'subtleWave 2s ease-in-out infinite' : 'none',
                animationDelay: `${waveDelay}s`,
                transition: 'color 0.1s, text-shadow 0.1s',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          )
        })}
        <style>{`
          @keyframes subtleWave {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
        `}</style>
      </>
    )
  }, [r, g, b])

  // Animation state for moving background with beat detection
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  
  // Setup audio analyser for beat detection
  useEffect(() => {
    if (!showLyrics || !audioElement) return
    
    // Only create audio context once
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    
    const audioContext = audioContextRef.current
    
    // Only create source once per audio element
    if (!sourceRef.current) {
      try {
        sourceRef.current = audioContext.createMediaElementSource(audioElement)
        sourceRef.current.connect(audioContext.destination)
      } catch {
        // Source already created, that's fine
      }
    }
    
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser()
      analyserRef.current.fftSize = 256
      sourceRef.current?.connect(analyserRef.current)
    }
    
    return () => {
      // Don't disconnect - keep the audio flowing
    }
  }, [showLyrics, audioElement])
  
  // Beat animation state
  const [bassLevel, setBassLevel] = useState(0)
  const [bgScale, setBgScale] = useState(1)
  const [bgPosition, setBgPosition] = useState({ x: 0, y: 0 })
  const [time, setTime] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Animate background with flowing river-like motion
  useEffect(() => {
    if (!showLyrics) return
    
    let animationId: number
    let t = 0
    const dataArray = new Uint8Array(analyserRef.current?.frequencyBinCount || 128)
    
    const animate = () => {
      t += 0.02 // Faster time progression for more noticeable movement
      setTime(t)
      
      // Get frequency data for beat detection
      let bass = 0
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray)
        for (let i = 0; i < 8; i++) {
          bass += dataArray[i]
        }
        bass = (bass / 8 / 255) ** 0.8
      }
      
      // Fast attack, slower decay for punchy response
      setBassLevel(prev => {
        const target = bass
        return target > prev ? prev + (target - prev) * 0.8 : prev + (target - prev) * 0.1
      })
      
      // Scale pulses with bass
      setBgScale(prev => {
        const target = 1.3 + bass * 0.2
        return prev + (target - prev) * 0.3
      })
      
      // River-like flowing movement - multiple sine waves at different frequencies
      // Creates organic, random-feeling motion
      const flowX = Math.sin(t * 0.8) * 60 + Math.sin(t * 1.3) * 40 + Math.sin(t * 2.1) * 20
      const flowY = Math.cos(t * 0.6) * 50 + Math.cos(t * 1.1) * 35 + Math.sin(t * 1.7) * 25
      
      setBgPosition({
        x: flowX + bass * 30 * Math.sin(t * 4),
        y: flowY + bass * 25 * Math.cos(t * 3.5)
      })
      
      animationId = requestAnimationFrame(animate)
    }
    
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [showLyrics, isPlaying])

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col text-white overflow-hidden"
      style={{ 
        backgroundColor: '#000',
        cursor: controlsVisible ? 'auto' : 'none'
      }}
    >
      {/* Album art background with blur - moving and beat reactive */}
      {showLyrics && currentTrack && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Album art background - blurred, saturated, moving with beat */}
          <div 
            className="absolute"
            style={{
              top: '-20%',
              left: '-20%',
              right: '-20%',
              bottom: '-20%',
              backgroundImage: `url(https://img.youtube.com/vi/${currentTrack.id}/maxresdefault.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: `blur(80px) saturate(2) brightness(0.3)`,
              transform: `scale(${bgScale}) translate(${bgPosition.x}px, ${bgPosition.y}px)`,
            }}
          />
          
          {/* Second layer - moves opposite direction */}
          <div 
            className="absolute"
            style={{
              top: '-30%',
              left: '-30%',
              right: '-30%',
              bottom: '-30%',
              backgroundImage: `url(https://img.youtube.com/vi/${currentTrack.id}/maxresdefault.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: `blur(120px) saturate(1.5) brightness(0.2) hue-rotate(${Math.sin(time) * 10}deg)`,
              transform: `scale(${bgScale * 1.1}) translate(${-bgPosition.x * 0.7}px, ${-bgPosition.y * 0.7}px)`,
              opacity: 0.7,
              mixBlendMode: 'soft-light',
            }}
          />
          
          {/* Color overlay that pulses and moves with beat */}
          <div 
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at ${30 + bgPosition.x * 0.5}% ${30 + bgPosition.y * 0.5}%, rgba(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)}, ${0.4 + bassLevel * 0.3}) 0%, transparent 50%)`,
              transform: `scale(${1 + bassLevel * 0.4})`,
              filter: 'blur(40px)',
            }}
          />
          
          {/* Secondary color blob - moves opposite */}
          <div 
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at ${70 - bgPosition.x * 0.3}% ${70 - bgPosition.y * 0.3}%, rgba(${Math.min(255, r * 0.8)}, ${Math.min(255, g * 1.2)}, ${Math.min(255, b * 1.2)}, ${0.3 + bassLevel * 0.2}) 0%, transparent 50%)`,
              transform: `scale(${1 + bassLevel * 0.3})`,
              filter: 'blur(60px)',
            }}
          />
          
          {/* Dark gradient overlay for text readability */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.3) 100%)',
            }}
          />
          
          {/* Top/bottom fade for depth */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.4) 100%)',
            }}
          />
        </div>
      )}

      {/* Normal gradient background (non-lyrics mode) */}
      {!showLyrics && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            background: `linear-gradient(180deg, ${bgColor} 0%, rgb(12, 12, 12) 100%)` 
          }}
        />
      )}

      {/* Blurred album art background (non-lyrics mode) */}
      {currentTrack && !imgError && !showLyrics && (
        <div 
          className="absolute inset-0 opacity-30 blur-3xl scale-110 pointer-events-none"
          style={{
            backgroundImage: `url(${currentTrack.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top bar */}
        <div 
          className="flex items-center justify-between px-8 py-5 transition-opacity duration-300"
          style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
        >
          <div className="text-sm font-medium opacity-80">
            {currentTrack?.artists[0]?.name || 'Unknown Artist'}
          </div>
          <button 
            onClick={handleExit}
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Exit fullscreen (Esc)"
          >
            <Minimize2 size={22} />
          </button>
        </div>

        {/* Main content */}
        <div 
          className={`flex-1 flex items-center overflow-hidden transition-all duration-500 ${
            showLyrics 
              ? (controlsVisible ? 'justify-start px-16 gap-12' : 'justify-center px-16 gap-16') 
              : 'justify-center gap-16 px-12'
          }`}
        >
          {/* Album art - left side in lyrics mode */}
          <div className={`flex-shrink-0 ${showLyrics ? 'flex flex-col items-center' : ''}`}>
            {currentTrack ? (
              imgError ? (
                <div className={`${showLyrics ? 'w-[280px] h-[280px]' : 'w-[400px] h-[400px]'} rounded-xl bg-neutral-800/50 flex items-center justify-center shadow-2xl`}>
                  <Music size={showLyrics ? 70 : 120} className="text-neutral-600" />
                </div>
              ) : (
                <div className={`${showLyrics ? 'w-[280px] h-[280px]' : 'w-[400px] h-[400px]'} rounded-xl overflow-hidden shadow-2xl`}>
                  <img 
                    ref={imgRef}
                    src={`https://img.youtube.com/vi/${currentTrack.id}/maxresdefault.jpg`} 
                    alt={currentTrack.title}
                    className="w-full h-full object-cover scale-[1.15] transition-all duration-300"
                    onError={() => setImgError(true)}
                  />
                </div>
              )
            ) : (
              <div className={`${showLyrics ? 'w-[280px] h-[280px]' : 'w-[400px] h-[400px]'} rounded-xl bg-neutral-800/50 flex items-center justify-center`}>
                <Music size={showLyrics ? 70 : 120} className="text-neutral-600" />
              </div>
            )}
            
            {/* Track info below album art in lyrics mode */}
            {showLyrics && currentTrack && (
              <div className="mt-5 text-center w-[280px]">
                <h2 className="text-lg font-bold truncate">{currentTrack.title}</h2>
                <p className="text-neutral-400 text-sm mt-1 truncate">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Lyrics panel (when lyrics mode is on) */}
          {showLyrics ? (
            <div className="flex-1 h-[calc(100vh-220px)] max-h-[600px]">
              {lyricsLoading ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Loader2 size={40} className="animate-spin mb-4" style={{ color: accentColor }} />
                  <p className="text-white/60">Loading lyrics...</p>
                </div>
              ) : !lyrics ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Music size={64} className="text-white/30 mb-4" />
                  <p className="text-white/60 text-lg">No lyrics available</p>
                </div>
              ) : lyrics.syncedLyrics ? (
                <div 
                  ref={lyricsContainerRef}
                  className="h-full overflow-y-auto px-12"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  tabIndex={-1}
                >
                  <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                  <div className="min-h-full flex flex-col">
                    {/* Top padding so first line can be centered */}
                    <div className="h-[40vh] flex-shrink-0" />
                    {lyrics.syncedLyrics.map((line, index) => {
                      const isCurrentLine = index === currentLineIndex
                      const isPastLine = index < currentLineIndex
                      
                      return (
                        <div
                          key={index}
                          ref={el => lineRefs.current[index] = el}
                          onClick={() => handleLineClick(line.time)}
                          className={`py-2 cursor-pointer font-bold leading-snug ${
                            isCurrentLine ? 'text-[2rem]' : 'text-[1.5rem]'
                          }`}
                          style={{
                            color: '#ffffff',
                            opacity: isPastLine ? 0.33 : isCurrentLine ? 1 : 0.66,
                            filter: isPastLine ? 'blur(2.5px)' : 'blur(0px)',
                            transform: isCurrentLine ? 'scale(1.02)' : 'scale(1)',
                            transformOrigin: 'left center',
                            paddingLeft: '4px',
                            transition: 'opacity 0.5s ease, filter 0.5s ease, transform 0.3s ease, font-size 0.3s ease',
                          }}
                        >
                          {isCurrentLine 
                            ? renderAnimatedText(line.text, true, lineProgress)
                            : <span>{line.text}</span>
                          }
                        </div>
                      )
                    })}
                    {/* Bottom padding so last line can be centered */}
                    <div className="h-[40vh] flex-shrink-0" />
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto pr-4" style={{ scrollbarWidth: 'none' }}>
                  <div className="whitespace-pre-wrap text-xl leading-loose font-medium text-white/80 py-8">
                    {lyrics.plainLyrics}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Right side panels (normal mode) */
            <div className="w-[380px] flex flex-col gap-5 max-h-[500px] overflow-y-auto">
            {/* About the artist */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
              <h3 className="text-lg font-bold mb-4">About the artist</h3>
              {currentTrack?.artists[0] && (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-700/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <Music size={28} className="text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{currentTrack.artists[0].name}</p>
                    <p className="text-sm text-neutral-400 mt-0.5">Artist</p>
                    <button 
                      onClick={() => {
                        handleExit()
                        if (currentTrack.artists[0].id) {
                          openArtist(currentTrack.artists[0].id)
                        }
                      }}
                      className="mt-2 px-4 py-1.5 border border-white/30 rounded-full text-sm font-medium hover:border-white hover:bg-white/10 transition"
                    >
                      View Artist
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Credits */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
              <h3 className="text-lg font-bold mb-3">Credits</h3>
              {currentTrack?.artists.map((artist, idx) => (
                <div key={artist.id || idx} className="py-2">
                  <p className="font-medium">{artist.name}</p>
                  <p className="text-sm text-neutral-400">
                    {idx === 0 ? 'Main Artist' : 'Featured Artist'}
                  </p>
                </div>
              ))}
            </div>

            {/* Next in queue */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Next in queue</h3>
                <button 
                  onClick={() => { handleExit(); setView('queue') }}
                  className="text-sm text-neutral-400 hover:text-white transition"
                >
                  Open queue
                </button>
              </div>
              {nextTracks.length > 0 ? (
                <div className="space-y-2">
                  {nextTracks.map((track, idx) => (
                    <div 
                      key={track.id}
                      onClick={() => playTrackFromQueue(queueIndex + 1 + idx)}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-white/10 cursor-pointer transition"
                    >
                      <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                        <img src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover scale-[1.35]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <p className="text-xs text-neutral-400 truncate">
                          {track.artists.map(a => a.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No more tracks in queue</p>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Bottom player */}
        <div 
          className="px-8 pb-8 pt-4 transition-opacity duration-300"
          style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
        >
          {/* Track title (only in non-lyrics mode) */}
          {!showLyrics && (
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-2xl font-bold">{currentTrack?.title || 'No track'}</h2>
                <p className="text-neutral-400">
                  {currentTrack?.artists.map(a => a.name).join(', ') || 'Unknown artist'}
                </p>
              </div>
              <button onClick={() => currentTrack && toggleLike(currentTrack)} className="p-2">
                <Heart size={24} className={trackIsLiked ? 'text-ios-blue fill-ios-blue' : 'text-neutral-400 hover:text-white'} />
              </button>
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs text-neutral-400 w-10 text-right">{formatTime(currentTimeFormatted)}</span>
            <div 
              className="flex-1 relative h-6 flex items-center cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const newProgress = Math.max(0, Math.min(1, x / rect.width))
                handleSeek(newProgress)
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                const container = e.currentTarget
                const rect = container.getBoundingClientRect()
                
                // Initial click position
                const x = e.clientX - rect.left
                const newProgress = Math.max(0, Math.min(1, x / rect.width))
                handleSeek(newProgress)
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const moveX = moveEvent.clientX - rect.left
                  const moveProgress = Math.max(0, Math.min(1, moveX / rect.width))
                  handleSeek(moveProgress)
                }
                
                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove)
                  window.removeEventListener('mouseup', onMouseUp)
                }
                
                window.addEventListener('mousemove', onMouseMove)
                window.addEventListener('mouseup', onMouseUp)
              }}
            >
              {/* Visual track */}
              <div className="w-full h-1.5 bg-white/20 rounded-full relative">
                <div className="absolute h-full bg-white rounded-full" style={{ width: `${progress * 100}%` }} />
              </div>
              {/* Thumb */}
              <div 
                className="absolute w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none"
                style={{ left: `calc(${progress * 100}% - 8px)` }}
              />
            </div>
            <span className="text-xs text-neutral-400 w-10">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="w-48" />
            
            {/* Center controls */}
            <div className="flex items-center gap-8">
              <button onClick={handleToggleShuffle} className={`p-2 ${shuffle ? 'text-ios-blue' : 'text-neutral-400 hover:text-white'} transition`}>
                <Shuffle size={22} />
              </button>
              <button onClick={handlePrevTrack} className="p-2 text-white hover:scale-110 transition">
                <SkipBack size={28} fill="white" />
              </button>
              <button 
                onClick={handleTogglePlay} disabled={!currentTrack || isLoading}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={32} className="animate-spin" /> : isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
              </button>
              <button onClick={handleNextTrack} className="p-2 text-white hover:scale-110 transition">
                <SkipForward size={28} fill="white" />
              </button>
              <button onClick={handleCycleRepeat} className={`p-2 ${repeat !== 'off' ? 'text-ios-blue' : 'text-neutral-400 hover:text-white'} transition`}>
                <RepeatIcon size={22} />
              </button>
            </div>

            {/* Right - volume and lyrics */}
            <div className="flex items-center gap-3 w-48 justify-end">
              <button 
                onClick={() => setShowLyrics(!showLyrics)} 
                className={`p-2 transition ${showLyrics ? 'text-ios-blue' : 'text-neutral-400 hover:text-white'}`}
                title="Toggle lyrics"
              >
                <Mic2 size={22} />
              </button>
              <button onClick={() => { handleExit(); setView('queue') }} className="p-2 text-neutral-400 hover:text-white transition">
                <ListMusic size={22} />
              </button>
              <button onClick={handleToggleMute} className="p-2 text-neutral-400 hover:text-white transition">
                {volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <div className="w-28 relative h-1 bg-white/20 rounded-full">
                <div className="absolute h-full bg-white rounded-full pointer-events-none" style={{ width: `${volume * 100}%` }} />
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => handleSetVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
