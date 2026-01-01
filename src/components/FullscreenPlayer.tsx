import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Heart, ListMusic, Loader2, Music, Minimize2 } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'

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
    currentTrack, isPlaying, volume, progress, duration, shuffle, repeat, isLoading, queue, queueIndex,
    togglePlay, setVolume, seek, toggleShuffle, cycleRepeat, nextTrack, prevTrack,
    toggleLike, isLiked, playTrackFromQueue
  } = usePlayerStore()
  const { setView, openArtist } = useAppStore()
  const [imgError, setImgError] = useState(false)
  const [bgColor, setBgColor] = useState('rgb(30, 50, 40)')
  const imgRef = useRef<HTMLImageElement>(null)

  const trackIsLiked = currentTrack ? isLiked(currentTrack.id) : false

  useEffect(() => {
    setImgError(false)
  }, [currentTrack?.id])

  // Extract color from album art
  useEffect(() => {
    if (!currentTrack?.thumbnail) return
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const color = extractColor(img)
      setBgColor(color)
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
  const currentTime = progress * duration
  const nextTracks = queue.slice(queueIndex + 1, queueIndex + 4)

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col text-white overflow-hidden"
      style={{ 
        background: `linear-gradient(180deg, ${bgColor} 0%, rgb(12, 12, 12) 100%)` 
      }}
    >
      {/* Blurred album art background */}
      {currentTrack && !imgError && (
        <div 
          className="absolute inset-0 opacity-30 blur-3xl scale-110"
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
        <div className="flex-1 flex items-center justify-center gap-16 px-12 overflow-hidden">
          {/* Album art - large and centered */}
          <div className="flex-shrink-0">
            {currentTrack ? (
              imgError ? (
                <div className="w-[400px] h-[400px] rounded-xl bg-neutral-800/50 flex items-center justify-center shadow-2xl">
                  <Music size={120} className="text-neutral-600" />
                </div>
              ) : (
                <img 
                  ref={imgRef}
                  src={currentTrack.thumbnail.replace('w120-h120', 'w544-h544').replace('w226-h226', 'w544-h544')} 
                  alt={currentTrack.title}
                  className="w-[400px] h-[400px] rounded-xl object-cover shadow-2xl"
                  onError={() => setImgError(true)}
                />
              )
            ) : (
              <div className="w-[400px] h-[400px] rounded-xl bg-neutral-800/50 flex items-center justify-center">
                <Music size={120} className="text-neutral-600" />
              </div>
            )}
          </div>

          {/* Right side panels */}
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
                      <img src={track.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
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
        </div>

        {/* Bottom player */}
        <div className="px-8 pb-8 pt-4">
          {/* Track title */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">{currentTrack?.title || 'No track'}</h2>
              <p className="text-neutral-400">
                {currentTrack?.artists.map(a => a.name).join(', ') || 'Unknown artist'}
              </p>
            </div>
            <button onClick={() => currentTrack && toggleLike(currentTrack)} className="p-2">
              <Heart size={24} className={trackIsLiked ? 'text-green-500 fill-green-500' : 'text-neutral-400 hover:text-white'} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs text-neutral-400 w-10 text-right">{formatTime(currentTime)}</span>
            <div className="flex-1 relative h-1.5 bg-white/20 rounded-full group cursor-pointer">
              <div className="absolute h-full bg-white rounded-full" style={{ width: `${progress * 100}%` }} />
              <input
                type="range" min="0" max="1" step="0.001" value={progress}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
              <div 
                className="absolute w-4 h-4 bg-white rounded-full -top-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition"
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
              <button onClick={toggleShuffle} className={`p-2 ${shuffle ? 'text-green-500' : 'text-neutral-400 hover:text-white'} transition`}>
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
              <button onClick={cycleRepeat} className={`p-2 ${repeat !== 'off' ? 'text-green-500' : 'text-neutral-400 hover:text-white'} transition`}>
                <RepeatIcon size={22} />
              </button>
            </div>

            {/* Right - volume */}
            <div className="flex items-center gap-3 w-48 justify-end">
              <button onClick={() => { onExit(); setView('queue') }} className="p-2 text-neutral-400 hover:text-white transition">
                <ListMusic size={22} />
              </button>
              <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="p-2 text-neutral-400 hover:text-white transition">
                {volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <div className="w-28 relative h-1 bg-white/20 rounded-full">
                <div className="absolute h-full bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
