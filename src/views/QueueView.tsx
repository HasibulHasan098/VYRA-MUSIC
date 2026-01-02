import { Play, Pause, X, Music2 } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import Tooltip from '../components/Tooltip'

export default function QueueView() {
  const { darkMode, setView } = useAppStore()
  const { queue, queueIndex, currentTrack, isPlaying, playTrackFromQueue, togglePlay } = usePlayerStore()

  const formatDuration = (seconds: number) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-fib-21">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-fib-34 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
          Queue
        </h1>
        <Tooltip text="Close">
          <button 
            onClick={() => setView('home')}
            className="p-fib-8 rounded-fib-8 ios-active text-ios-gray hover:text-ios-blue ios-transition"
          >
            <X size={21} />
          </button>
        </Tooltip>
      </div>

      {/* Now playing */}
      {currentTrack && (
        <section>
          <h2 className="text-fib-13 font-semibold text-ios-gray uppercase tracking-wider mb-fib-8">
            Now Playing
          </h2>
          <div className={`flex items-center gap-fib-13 p-fib-13 rounded-fib-13
            ${darkMode ? 'bg-ios-blue/20' : 'bg-ios-blue/10'}`}>
            <div className="relative">
              <div className="w-fib-55 h-fib-55 rounded-fib-8 overflow-hidden">
                <img 
                  src={`https://img.youtube.com/vi/${currentTrack.id}/hqdefault.jpg`} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover scale-[1.35]"
                />
              </div>
              {isPlaying && (
                <div className="absolute -right-1 -bottom-1 w-5 h-5 bg-ios-blue rounded-full flex items-center justify-center shadow-lg">
                  <Music2 size={12} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-fib-13 font-medium truncate text-ios-blue`}>
                {currentTrack.title}
              </p>
              <p className="text-fib-13 text-ios-gray truncate">
                {currentTrack.artists.map(a => a.name).join(', ')}
              </p>
            </div>
            <Tooltip text={isPlaying ? 'Pause' : 'Play'}>
              <button 
                onClick={togglePlay}
                className="w-fib-34 h-fib-34 flex items-center justify-center rounded-full bg-ios-blue text-white ios-active"
              >
                {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
              </button>
            </Tooltip>
          </div>
        </section>
      )}

      {/* Up next */}
      {queue.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-fib-8">
            <h2 className="text-fib-13 font-semibold text-ios-gray uppercase tracking-wider">
              Up Next ({queue.length - queueIndex - 1} songs)
            </h2>
          </div>
          <div className="space-y-fib-3">
            {queue.map((track, index) => {
              const isActive = index === queueIndex
              const isPast = index < queueIndex

              return (
                <div 
                  key={`${track.id}-${index}`}
                  onClick={() => playTrackFromQueue(index)}
                  className={`group flex items-center gap-fib-13 px-fib-13 py-fib-8 rounded-fib-8 ios-transition cursor-pointer
                    ${isActive 
                      ? darkMode ? 'bg-ios-blue/20' : 'bg-ios-blue/10'
                      : isPast 
                        ? 'opacity-50'
                        : darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                >
                  {/* Index */}
                  <div className="w-fib-21 text-center flex-shrink-0">
                    {isActive && isPlaying ? (
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="w-0.5 h-2 bg-ios-blue rounded-full animate-pulse" />
                        <span className="w-0.5 h-3 bg-ios-blue rounded-full animate-pulse delay-75" />
                        <span className="w-0.5 h-2 bg-ios-blue rounded-full animate-pulse delay-150" />
                      </div>
                    ) : (
                      <span className={`text-fib-13 ${isActive ? 'text-ios-blue' : 'text-ios-gray'}`}>
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <div className="w-fib-34 h-fib-34 rounded-fib-5 overflow-hidden">
                      <img 
                        src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} 
                        alt={track.title}
                        className="w-full h-full object-cover scale-[1.35]"
                      />
                    </div>
                    {isActive && isPlaying && (
                      <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-ios-blue rounded-full flex items-center justify-center shadow">
                        <Music2 size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-fib-13 font-medium truncate 
                      ${isActive ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}>
                      {track.title}
                    </p>
                    <p className="text-fib-13 text-ios-gray truncate">
                      {track.artists.map(a => a.name).join(', ')}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-fib-13 text-ios-gray flex-shrink-0">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {queue.length === 0 && !currentTrack && (
        <div className="flex flex-col items-center justify-center py-fib-89 text-center">
          <p className={`text-fib-21 font-semibold mb-fib-8 ${darkMode ? 'text-white' : 'text-black'}`}>
            Queue is empty
          </p>
          <p className="text-fib-13 text-ios-gray">
            Add songs to your queue to see them here
          </p>
        </div>
      )}
    </div>
  )
}
