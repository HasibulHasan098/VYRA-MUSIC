import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  const [currentTime, setCurrentTime] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  const trackIsLiked = currentTrack ? isLiked(currentTrack.id) : false

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

  // High-frequency time update for smooth animation
  useEffect(() => {
    if (!audioElement || !showLyrics) return

    const updateTime = () => {
      setCurrentTime(audioElement.currentTime)
    }

    audioElement.addEventListener('timeupdate', updateTime)
    const interval = setInterval(updateTime, 50)

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime)
      clearInterval(interval)
    }
  }, [audioElement, showLyrics])

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

  // Auto-scroll lyrics
  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex] && lyricsContainerRef.current) {
      const line = lineRefs.current[currentLineIndex]
      const container = lyricsContainerRef.current
      
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

  // Extract color from album art
  useEffect(() => {
    if (!currentTrack?.thumbnail) return
    
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
    img.src = currentTrack.thumbnail
  }, [currentTrack?.thumbnail])

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onExit])

  // Set window to fullscreen using Tauri API
  useEffect(() => {
    let isMounted = true
    
    const setFullscreen = async () => {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window')
          const win = getCurrentWindow()
          if (isMounted) {
            await win.setFullscreen(true)
            console.log('Fullscreen enabled')
          }
        } catch (e) {
          console.log('Fullscreen not available:', e)
        }
      }
    }
    
    // Small delay to ensure component is mounted
    const timer = setTimeout(setFullscreen, 50)

    return () => {
      isMounted = false
      clearTimeout(timer)
      // Exit fullscreen when component unmounts
      const exitFullscreen = async () => {
        if (typeof window !== 'undefined' && '__TAURI__' in window) {
          try {
            const { getCurrentWindow } = await import('@tauri-apps/api/window')
            const win = getCurrentWindow()
            await win.setFullscreen(false)
            // Ensure decorations stay disabled after exiting fullscreen
            await win.setDecorations(false)
            console.log('Fullscreen disabled')
          } catch (e) {
            console.log('Could not exit fullscreen:', e)
          }
        }
      }
      exitFullscreen()
    }
  }, [])

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
  const accentColor = `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`
  const accentColorBright = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`

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
                color: isRevealed ? accentColorBright : 'rgba(255, 255, 255, 0.3)',
                textShadow: isRevealed ? `0 0 20px ${accentColor}, 0 0 40px ${accentColor}` : 'none',
              }}
            >
              {char}
            </span>
          )
        })}
      </>
    )
  }, [accentColor, accentColorBright])

  // Animation state for moving background with beat detection
  const [bgOffset, setBgOffset] = useState({ x: 0, y: 0 })
  const [beatPulse, setBeatPulse] = useState(1)
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
  
  // Animate background with beat
  useEffect(() => {
    if (!showLyrics) return
    
    let animationId: number
    let time = 0
    const dataArray = new Uint8Array(analyserRef.current?.frequencyBinCount || 128)
    
    const animate = () => {
      time += 0.008
      
      // Get bass frequencies for beat detection
      let bass = 0
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray)
        // Average of low frequencies (bass)
        for (let i = 0; i < 10; i++) {
          bass += dataArray[i]
        }
        bass = bass / 10 / 255 // Normalize to 0-1
      }
      
      // Pulse effect based on bass
      const targetPulse = 1 + bass * 0.3
      setBeatPulse(prev => prev + (targetPulse - prev) * 0.3)
      
      // Movement with beat influence
      const beatInfluence = 1 + bass * 0.5
      setBgOffset({
        x: Math.sin(time) * 40 * beatInfluence,
        y: Math.cos(time * 0.7) * 30 * beatInfluence
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
        backgroundColor: '#0a0a0a'
      }}
    >
      {/* Solid animated background for lyrics mode */}
      {showLyrics && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ backgroundColor: `rgb(${Math.floor(r * 0.12)}, ${Math.floor(g * 0.12)}, ${Math.floor(b * 0.12)})` }}>
          {/* Large moving gradient blob 1 - pulses with beat */}
          <div 
            className="absolute rounded-full"
            style={{ 
              width: `${800 * beatPulse}px`,
              height: `${800 * beatPulse}px`,
              background: `radial-gradient(circle, rgba(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)}, ${0.5 + beatPulse * 0.15}) 0%, transparent 60%)`,
              top: `calc(5% + ${bgOffset.y}px)`,
              left: `calc(-10% + ${bgOffset.x}px)`,
              filter: 'blur(80px)',
            }}
          />
          {/* Large moving gradient blob 2 - pulses with beat */}
          <div 
            className="absolute rounded-full"
            style={{ 
              width: `${650 * beatPulse}px`,
              height: `${650 * beatPulse}px`,
              background: `radial-gradient(circle, rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 60)}, ${0.4 + beatPulse * 0.15}) 0%, transparent 60%)`,
              bottom: `calc(10% + ${-bgOffset.y * 0.8}px)`,
              right: `calc(-5% + ${-bgOffset.x * 0.8}px)`,
              filter: 'blur(60px)',
            }}
          />
          {/* Center accent blob - pulses with beat */}
          <div 
            className="absolute rounded-full"
            style={{ 
              width: `${550 * beatPulse}px`,
              height: `${550 * beatPulse}px`,
              background: `radial-gradient(circle, rgba(${Math.max(0, r - 20)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 20)}, ${0.35 + beatPulse * 0.1}) 0%, transparent 60%)`,
              top: `calc(40% + ${bgOffset.x * 0.5}px)`,
              left: `calc(30% + ${bgOffset.y * 0.5}px)`,
              filter: 'blur(70px)',
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
        <div className="flex items-center justify-between px-8 py-5">
          <div className="text-sm font-medium opacity-80">
            {currentTrack?.artists[0]?.name || 'Unknown Artist'}
          </div>
          <button 
            onClick={onExit}
            className="p-2 hover:bg-white/10 rounded-full transition"
            title="Exit fullscreen (Esc)"
          >
            <Minimize2 size={22} />
          </button>
        </div>

        {/* Main content */}
        <div className={`flex-1 flex items-center ${showLyrics ? 'justify-start px-16 gap-12' : 'justify-center gap-16 px-12'} overflow-hidden`}>
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
            <div className="flex-1 h-[calc(100vh-220px)] max-h-[600px] overflow-hidden">
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
                  className="h-full overflow-y-auto pl-4 pr-8"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  tabIndex={-1}
                >
                  <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                  <div className="min-h-full flex flex-col py-8">
                    {/* Top padding for scroll */}
                    <div className="h-[30vh] flex-shrink-0" />
                    {lyrics.syncedLyrics.map((line, index) => {
                      const isCurrentLine = index === currentLineIndex
                      const isPastLine = index < currentLineIndex
                      
                      return (
                        <div
                          key={index}
                          ref={el => lineRefs.current[index] = el}
                          onClick={() => handleLineClick(line.time)}
                          className="py-3 cursor-pointer font-bold leading-tight pl-2"
                          style={{
                            fontSize: isCurrentLine ? '2.5rem' : '1.75rem',
                            color: isPastLine ? 'rgba(255,255,255,0.25)' : isCurrentLine ? undefined : 'rgba(255,255,255,0.4)',
                            transform: isCurrentLine ? 'scale(1.02)' : 'scale(1)',
                            transformOrigin: 'left center',
                            transition: 'transform 0.3s ease, font-size 0.3s ease',
                            marginLeft: '-8px', // Compensate for glow space
                          }}
                        >
                          {renderAnimatedText(line.text, isCurrentLine, lineProgress)}
                        </div>
                      )
                    })}
                    {/* Bottom padding for scroll */}
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
                        onExit()
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
                  onClick={() => { onExit(); setView('queue') }}
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
        <div className="px-8 pb-8 pt-4">
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
            <div className="flex-1 relative h-1.5 bg-white/20 rounded-full group cursor-pointer">
              <div className="absolute h-full bg-white rounded-full pointer-events-none" style={{ width: `${progress * 100}%` }} />
              <input
                type="range" min="0" max="1" step="0.001" value={progress}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute w-4 h-4 bg-white rounded-full -top-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none"
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
              <button onClick={toggleShuffle} className={`p-2 ${shuffle ? 'text-ios-blue' : 'text-neutral-400 hover:text-white'} transition`}>
                <Shuffle size={22} />
              </button>
              <button onClick={prevTrack} className="p-2 text-white hover:scale-110 transition">
                <SkipBack size={28} fill="white" />
              </button>
              <button 
                onClick={togglePlay} disabled={!currentTrack || isLoading}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={32} className="animate-spin" /> : isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
              </button>
              <button onClick={nextTrack} className="p-2 text-white hover:scale-110 transition">
                <SkipForward size={28} fill="white" />
              </button>
              <button onClick={cycleRepeat} className={`p-2 ${repeat !== 'off' ? 'text-ios-blue' : 'text-neutral-400 hover:text-white'} transition`}>
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
              <button onClick={() => { onExit(); setView('queue') }} className="p-2 text-neutral-400 hover:text-white transition">
                <ListMusic size={22} />
              </button>
              <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="p-2 text-neutral-400 hover:text-white transition">
                {volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <div className="w-28 relative h-1 bg-white/20 rounded-full">
                <div className="absolute h-full bg-white rounded-full pointer-events-none" style={{ width: `${volume * 100}%` }} />
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
