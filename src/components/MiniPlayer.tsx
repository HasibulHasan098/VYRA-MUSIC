import { useEffect, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, X, GripHorizontal, Music } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'

export default function MiniPlayer() {
  const { 
    currentTrack, isPlaying, volume, progress, duration, shuffle, repeat,
    togglePlay, setVolume, seek, toggleShuffle, cycleRepeat, nextTrack, prevTrack
  } = usePlayerStore()
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [currentTrack?.id])

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  const currentTime = progress * duration

  const closeMiniPlayer = async () => {
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    }
  }

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Drag handle & close */}
      <div data-tauri-drag-region className="flex items-center justify-between px-3 py-2">
        <GripHorizontal size={16} className="text-gray-500" />
        <button onClick={closeMiniPlayer} className="p-1 hover:bg-white/10 rounded">
          <X size={16} />
        </button>
      </div>

      {/* Album art */}
      <div className="flex-1 flex items-center justify-center px-6 py-2">
        {currentTrack ? (
          imgError ? (
            <div className="w-40 h-40 rounded-lg bg-gray-800 flex items-center justify-center">
              <Music size={48} className="text-gray-600" />
            </div>
          ) : (
            <img 
              src={currentTrack.thumbnail} 
              alt={currentTrack.title}
              className="w-40 h-40 rounded-lg object-cover shadow-2xl"
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <div className="w-40 h-40 rounded-lg bg-gray-800 flex items-center justify-center">
            <Music size={48} className="text-gray-600" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="p-1 text-gray-400 hover:text-white">
          {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button onClick={toggleShuffle} className={`p-1 ${shuffle ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
          <Shuffle size={18} />
        </button>
        <button onClick={prevTrack} className="p-1 text-white hover:scale-110 transition">
          <SkipBack size={22} fill="white" />
        </button>
        <button 
          onClick={togglePlay}
          disabled={!currentTrack}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition disabled:opacity-50"
        >
          {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
        </button>
        <button onClick={nextTrack} className="p-1 text-white hover:scale-110 transition">
          <SkipForward size={22} fill="white" />
        </button>
        <button onClick={cycleRepeat} className={`p-1 ${repeat !== 'off' ? 'text-green-500' : 'text-gray-400 hover:text-white'}`}>
          <RepeatIcon size={18} />
        </button>
      </div>

      {/* Progress */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>{formatTime(currentTime)}</span>
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
      <div className="px-4 pb-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base truncate">
            {currentTrack?.title || 'No track'}
          </p>
          <p className="text-sm text-gray-400 truncate">
            {currentTrack?.artists.map(a => a.name).join(', ') || 'Unknown artist'}
          </p>
        </div>
      </div>
    </div>
  )
}
