import { useState } from 'react'
import { Music, ChevronRight, ChevronLeft } from 'lucide-react'
import { usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import Tooltip from './Tooltip'

export default function NowPlayingSidebar() {
  const { currentTrack, queue, queueIndex, playTrackFromQueue } = usePlayerStore()
  const { darkMode, openArtist, setView, nowPlayingCollapsed, toggleNowPlaying } = useAppStore()
  const [imgError, setImgError] = useState(false)

  // Reset image error when track changes
  if (currentTrack?.id && imgError) {
    setImgError(false)
  }

  if (!currentTrack) return null

  // Get next tracks in queue
  const nextTracks = queue.slice(queueIndex + 1, queueIndex + 4)

  // Get first artist name for header
  const firstArtistName = currentTrack.artists[0]?.name || 'Unknown Artist'

  // Collapsed view - show small thumbnail and queue list
  if (nowPlayingCollapsed) {
    // Get more tracks for collapsed view
    const collapsedQueueTracks = queue.slice(queueIndex + 1, queueIndex + 8)
    
    return (
      <aside className={`w-[70px] flex-shrink-0 border-l flex flex-col items-center pt-fib-13 gap-fib-8 overflow-y-auto
        ${darkMode ? 'bg-transparent border-ios-separator-dark' : 'bg-transparent border-ios-separator'}`}>
        
        {/* Expand button */}
        <Tooltip text="Expand Now Playing" position="left">
          <button
            onClick={toggleNowPlaying}
            className={`w-10 h-10 rounded-full flex items-center justify-center ios-active flex-shrink-0
              ${darkMode ? 'bg-ios-card-secondary-dark text-white hover:bg-white/10' : 'bg-ios-card-secondary text-black hover:bg-black/10'}`}
          >
            <ChevronLeft size={20} />
          </button>
        </Tooltip>

        {/* Current track thumbnail */}
        <Tooltip text={currentTrack.title} position="left">
          <div 
            onClick={toggleNowPlaying}
            className="cursor-pointer flex-shrink-0 ring-2 ring-ios-blue rounded-fib-8"
          >
            {imgError ? (
              <div className="w-[50px] h-[50px] rounded-fib-8 bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center">
                <Music size={24} className="text-white/80" />
              </div>
            ) : (
              <div className="w-[50px] h-[50px] rounded-fib-8 overflow-hidden shadow-ios">
                <img 
                  src={`https://img.youtube.com/vi/${currentTrack.id}/hqdefault.jpg`} 
                  alt=""
                  className="w-full h-full object-cover scale-[1.35]"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
          </div>
        </Tooltip>

        {/* Queue list - small thumbnails */}
        {collapsedQueueTracks.length > 0 && (
          <>
            <div className={`w-8 h-px my-fib-3 ${darkMode ? 'bg-ios-separator-dark' : 'bg-ios-separator'}`} />
            {collapsedQueueTracks.map((track, idx) => (
              <CollapsedQueueItem
                key={`collapsed-${track.id}-${idx}`}
                track={track}
                index={queueIndex + 1 + idx}
                darkMode={darkMode}
                onPlay={playTrackFromQueue}
              />
            ))}
          </>
        )}
      </aside>
    )
  }

  return (
    <aside className={`w-[300px] flex-shrink-0 border-l overflow-y-auto relative
      ${darkMode ? 'bg-transparent border-ios-separator-dark' : 'bg-transparent border-ios-separator'}`}>
      
      {/* Header - Artist name and collapse button on same row */}
      <div className="flex items-center justify-between p-fib-13">
        <p className={`text-fib-13 font-semibold truncate flex-1 ${darkMode ? 'text-white' : 'text-black'}`}>
          {firstArtistName}
        </p>
        <Tooltip text="Collapse Now Playing" position="left">
          <button
            onClick={toggleNowPlaying}
            className={`w-8 h-8 rounded-full flex items-center justify-center ios-active flex-shrink-0
              ${darkMode ? 'bg-ios-card-secondary-dark text-white hover:bg-white/10' : 'bg-ios-card-secondary text-black hover:bg-black/10'}`}
          >
            <ChevronRight size={18} />
          </button>
        </Tooltip>
      </div>
      
      {/* Current Track */}
      <div className="px-fib-13 pb-fib-21">

        {/* Album Art */}
        <div className="relative mb-fib-13">
          {imgError ? (
            <div className="w-full aspect-square rounded-fib-13 bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center">
              <Music size={55} className="text-white/80" />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-fib-13 overflow-hidden">
              <img 
                src={`https://img.youtube.com/vi/${currentTrack.id}/maxresdefault.jpg`} 
                alt=""
                className="w-full h-full object-cover scale-[1.15]"
                onError={() => setImgError(true)}
              />
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="flex items-start justify-between gap-fib-8">
          <div className="min-w-0 flex-1">
            <h2 className={`text-fib-21 font-bold truncate ${darkMode ? 'text-white' : 'text-black'}`}>
              {currentTrack.title}
            </h2>
            <p className="text-fib-13 text-ios-gray truncate">
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Credits Section */}
      <div className={`mx-fib-13 mb-fib-21 p-fib-13 rounded-fib-13
        ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
        <div className="flex items-center justify-between mb-fib-13">
          <h3 className={`text-fib-13 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
            Credits
          </h3>
        </div>

        <div className="space-y-fib-13">
          {currentTrack.artists.map((artist, idx) => (
            <div 
              key={`${artist.id || artist.name}-${idx}`}
              onClick={() => artist.id && openArtist(artist.id)}
              className={`flex items-center justify-between ${artist.id ? 'cursor-pointer group' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                  {artist.name}
                </p>
                <p className="text-fib-8 text-ios-gray">
                  {idx === 0 ? 'Main Artist' : 'Featured Artist'}
                </p>
              </div>
              {artist.id && (
                <ChevronRight size={16} className="text-ios-gray group-hover:text-ios-blue ios-transition flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next in Queue */}
      {nextTracks.length > 0 && (
        <div className={`mx-fib-13 mb-fib-21 p-fib-13 rounded-fib-13
          ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
          <div className="flex items-center justify-between mb-fib-13">
            <h3 className={`text-fib-13 font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
              Next in queue
            </h3>
            <button 
              onClick={() => setView('queue')}
              className="text-fib-13 text-ios-gray hover:text-ios-blue ios-transition"
            >
              Open queue
            </button>
          </div>

          <div className="space-y-fib-8">
            {nextTracks.map((track, idx) => (
              <NextTrackItem 
                key={`next-${track.id}-${idx}`}
                track={track}
                index={queueIndex + 1 + idx}
                darkMode={darkMode}
                onPlay={playTrackFromQueue}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function NextTrackItem({ 
  track, 
  index, 
  darkMode, 
  onPlay 
}: { 
  track: any
  index: number
  darkMode: boolean
  onPlay: (index: number) => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div 
      onClick={() => onPlay(index)}
      className={`flex items-center gap-fib-8 p-fib-5 rounded-fib-8 cursor-pointer ios-active
        ${darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
    >
      {imgError ? (
        <div className="w-[40px] h-[40px] rounded-fib-5 bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center flex-shrink-0">
          <Music size={16} className="text-white/80" />
        </div>
      ) : (
        <div className="w-[40px] h-[40px] rounded-fib-5 overflow-hidden flex-shrink-0">
          <img 
            src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} 
            alt=""
            className="w-full h-full object-cover scale-[1.35]"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-fib-13 font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
          {track.title}
        </p>
        <p className="text-fib-8 text-ios-gray truncate">
          {track.artists.map((a: any) => a.name).join(', ')}
        </p>
      </div>
    </div>
  )
}

function CollapsedQueueItem({ 
  track, 
  index, 
  darkMode, 
  onPlay 
}: { 
  track: any
  index: number
  darkMode: boolean
  onPlay: (index: number) => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <Tooltip text={track.title} position="left">
      <div 
        onClick={() => onPlay(index)}
        className={`cursor-pointer ios-active flex-shrink-0 rounded-fib-5 overflow-hidden
          ${darkMode ? 'hover:ring-2 hover:ring-white/30' : 'hover:ring-2 hover:ring-black/20'}`}
      >
        {imgError ? (
          <div className="w-[44px] h-[44px] bg-gradient-to-br from-ios-purple to-ios-blue flex items-center justify-center">
            <Music size={18} className="text-white/80" />
          </div>
        ) : (
          <div className="w-[44px] h-[44px] overflow-hidden">
            <img 
              src={`https://img.youtube.com/vi/${track.id}/hqdefault.jpg`} 
              alt=""
              className="w-full h-full object-cover scale-[1.35]"
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </div>
    </Tooltip>
  )
}
