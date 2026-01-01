import { useState } from 'react'
import { Play, MoreHorizontal, Music } from 'lucide-react'
import { Song, usePlayerStore } from '../store/playerStore'
import { useAppStore } from '../store/appStore'
import Tooltip from './Tooltip'
import SongContextMenu from './SongContextMenu'

interface TrackCardProps {
  track: Song
  showArtist?: boolean
  allTracks?: Song[]
  index?: number
}

// Generate a consistent color based on the title
const getColorFromTitle = (title: string): string => {
  const colors = [
    'from-red-500 to-red-700',
    'from-orange-500 to-orange-700',
    'from-amber-500 to-amber-700',
    'from-lime-500 to-lime-700',
    'from-green-500 to-green-700',
    'from-teal-500 to-teal-700',
    'from-cyan-500 to-cyan-700',
    'from-blue-500 to-blue-700',
    'from-indigo-500 to-indigo-700',
    'from-violet-500 to-violet-700',
    'from-purple-500 to-purple-700',
    'from-pink-500 to-pink-700',
  ]
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function TrackCard({ track, showArtist = true, allTracks, index = 0 }: TrackCardProps) {
  const { setCurrentTrack, setQueue, currentTrack, isPlaying } = usePlayerStore()
  const { darkMode } = useAppStore()
  const isActive = currentTrack?.id === track.id
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleClick = () => {
    if (allTracks && allTracks.length > 0) {
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
    setContextMenu({ x: rect.left, y: rect.bottom + 5 })
  }

  return (
    <>
      <div 
        className={`group relative rounded-fib-13 overflow-hidden ios-transition ios-active cursor-pointer flex-shrink-0 w-[160px]
          ${isActive 
            ? darkMode ? 'bg-ios-blue/20 ring-2 ring-ios-blue' : 'bg-ios-blue/10 ring-2 ring-ios-blue'
            : darkMode ? 'bg-ios-card-dark hover:bg-ios-card-secondary-dark' : 'bg-ios-card hover:bg-ios-card-secondary'}`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Thumbnail */}
        <div className="relative aspect-square">
          {imgError ? (
            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getColorFromTitle(track.title)}`}>
              <Music size={34} className="text-white/80" />
            </div>
          ) : (
            <div className="relative w-full h-full">
              {!imgLoaded && (
                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${getColorFromTitle(track.title)}`}>
                  <Music size={34} className="text-white/80" />
                </div>
              )}
              <img 
                src={track.thumbnail} 
                alt=""
                className={`w-full h-full object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onError={() => setImgError(true)}
                onLoad={() => setImgLoaded(true)}
              />
            </div>
          )}
          {/* Play overlay */}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ios-transition
            ${isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <div className="w-fib-34 h-fib-34 rounded-full bg-ios-blue flex items-center justify-center shadow-ios-lg">
              {isActive && isPlaying ? (
                <div className="flex items-center gap-0.5">
                  <span className="w-0.5 h-3 bg-white rounded-full animate-pulse" />
                  <span className="w-0.5 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                  <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                </div>
              ) : (
                <Play size={21} fill="white" className="text-white ml-1" />
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-fib-13">
          <p className={`text-fib-13 font-medium truncate ${isActive ? 'text-ios-blue' : darkMode ? 'text-white' : 'text-black'}`}>
            {track.title}
          </p>
          {showArtist && (
            <p className="text-fib-13 text-ios-gray truncate">
              {track.artists.map(a => a.name).join(', ')}
            </p>
          )}
        </div>

        {/* More button */}
        <Tooltip text="More options" position="left">
          <button 
            className="absolute top-fib-8 right-fib-8 p-fib-5 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 ios-transition ios-active"
            onClick={handleMoreClick}
          >
            <MoreHorizontal size={18} className="text-white" />
          </button>
        </Tooltip>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <SongContextMenu
          track={track}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
