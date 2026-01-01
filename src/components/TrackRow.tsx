import { useState } from 'react'
import { Play, MoreHorizontal, Heart, Music } from 'lucide-react'
import { Song, usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import Tooltip from './Tooltip'
import SongContextMenu from './SongContextMenu'

interface TrackRowProps {
  track: Song
  index: number
  allTracks?: Song[]
  showIndex?: boolean
  showDuration?: boolean
  playlistId?: string // For user playlists - enables "Remove from playlist" option
}

export default function TrackRow({ track, index, allTracks, showIndex = true, showDuration = true, playlistId }: TrackRowProps) {
  const { setCurrentTrack, setQueue, currentTrack, isPlaying, togglePlay, toggleLike, isLiked } = usePlayerStore()
  const { darkMode } = useAppStore()
  const isActive = currentTrack?.id === track.id
  const [imgError, setImgError] = useState(false)
  const trackIsLiked = isLiked(track.id)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return ''
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleClick = () => {
    if (isActive) {
      togglePlay()
    } else if (allTracks && allTracks.length > 0) {
      setQueue(allTracks, index)
    } else {
      setCurrentTrack(track)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setContextMenu({ x: rect.right, y: rect.top })
  }

  return (
    <>
      <div 
        className={`group flex items-center gap-fib-13 px-fib-13 py-fib-8 rounded-fib-8 ios-transition cursor-pointer
          ${isActive 
            ? darkMode ? 'bg-ios-blue/20' : 'bg-ios-blue/10'
            : darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Index / Play */}
        <div className="w-fib-21 text-center flex-shrink-0">
          {isActive && isPlaying ? (
            <div className="flex items-center justify-center gap-0.5">
              <span className="w-0.5 h-2 bg-ios-blue rounded-full animate-pulse" />
              <span className="w-0.5 h-3 bg-ios-blue rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
              <span className="w-0.5 h-2 bg-ios-blue rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            </div>
          ) : (
            <>
              <span className={`group-hover:hidden text-fib-13 ${isActive ? 'text-ios-blue' : 'text-ios-gray'}`}>
                {index + 1}
              </span>
              <Play size={13} className="hidden group-hover:block text-ios-gray mx-auto" fill="currentColor" />
            </>
          )}
        </div>

        {/* Thumbnail */}
        {imgError ? (
          <div className={`w-fib-34 h-fib-34 rounded-fib-5 flex items-center justify-center flex-shrink-0
            ${darkMode ? 'bg-ios-card-secondary-dark' : 'bg-ios-card-secondary'}`}>
            <Music size={16} className="text-ios-gray" />
          </div>
        ) : (
          <img 
            src={track.thumbnail} 
            alt={track.title}
            className="w-fib-34 h-fib-34 rounded-fib-5 object-cover flex-shrink-0"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-fib-13 font-medium truncate ${isActive ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}>
            {track.title}
          </p>
          <p className="text-fib-13 text-ios-gray truncate">
            {track.artists.map(a => a.name).join(', ')}
          </p>
        </div>

        {/* Album */}
        {track.album && (
          <p className="w-fib-144 text-fib-13 text-ios-gray truncate hidden lg:block flex-shrink-0">
            {track.album.name}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-fib-8 opacity-0 group-hover:opacity-100 ios-transition flex-shrink-0">
          <Tooltip text={trackIsLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}>
            <button 
              className="p-fib-5 ios-active"
              onClick={(e) => {
                e.stopPropagation()
                toggleLike(track)
              }}
            >
              <Heart 
                size={18} 
                className={`ios-transition ${trackIsLiked ? 'text-ios-red fill-ios-red' : 'text-ios-gray hover:text-ios-red'}`}
              />
            </button>
          </Tooltip>
          <Tooltip text="More options">
            <button className="p-fib-5 ios-active" onClick={handleMoreClick}>
              <MoreHorizontal size={18} className="text-ios-gray" />
            </button>
          </Tooltip>
        </div>

        {/* Duration - only show if showDuration is true and duration exists */}
        {showDuration && (
          <span className="w-fib-55 text-fib-13 text-ios-gray text-right flex-shrink-0">
            {track.duration > 0 ? formatDuration(track.duration) : ''}
          </span>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <SongContextMenu
          track={track}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          playlistId={playlistId}
        />
      )}
    </>
  )
}
